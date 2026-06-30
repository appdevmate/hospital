'use strict';

// ─────────────────────────────────────────────────────────────────────
// akwadona-scribe — ScribeFirst Phase 1 backend.
//
// Endpoints (all behind JWT authoriser):
//   POST   /scribe/sessions                 → create session, return sessionId
//   POST   /scribe/sessions/{id}/soap       → split transcript into SOAP via Bedrock
//   POST   /scribe/sessions/{id}/approve    → write approval audit row
//   GET    /scribe/sessions/{id}            → fetch session detail
//
// Why Bedrock for the SOAP split:
//   The transcript is a free-flowing doctor-patient dialogue. A simple
//   regex/keyword split is unreliable. A small LLM call (Claude Haiku)
//   produces a usable SOAP draft for under a cent per visit.
// ─────────────────────────────────────────────────────────────────────

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { randomUUID, createHash } = require('crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');
// Step 2d-4 — per-row tenant enforcement.
const { assertRowTenant } = require('./tenant-guard');

const REGION     = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';
const BEDROCK_REGION = process.env.BEDROCK_REGION || REGION;
// Claude 3.5 Haiku via Bedrock (US cross-region inference profile) — cheap,
// fast, sufficient for SOAP structuring. The CDK stack sets BEDROCK_MODEL_ID;
// this fallback only applies if the env var is missing. The original
// claude-3-haiku-20240307 model was retired/marked legacy by the provider.
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

// ── Tenant enforcement (Step 2d) — guard at handler entry. ───────────────────
function getTenant(event) {
  const claims = (event && event.requestContext && event.requestContext.authorizer
                  && (event.requestContext.authorizer.jwt
                      ? event.requestContext.authorizer.jwt.claims
                      : event.requestContext.authorizer.claims))
              || {};
  const tenantId = claims.tenantId || claims['custom:tenantId'];
  if (!tenantId || tenantId === 'UNASSIGNED') {
    const e = new Error('Tenant not assigned for this user');
    e.statusCode = 403;
    throw e;
  }
  return tenantId;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function nowIso() {
    return new Date().toISOString();
}

function ok(body, status = 200) {
    return {
        statusCode: status,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function err(message, status = 400, extra = {}) {
    return ok({ error: message, ...extra }, status);
}

function getActor(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
    return {
        email: claims.email || claims['cognito:username'] || 'unknown',
        groups: (claims['cognito:groups'] ? String(claims['cognito:groups']).split(',') : [])
            .map((g) => g.replace(/^\[|\]$/g, ''))
    };
}

function isDoctorOrAdmin(actor) {
    return actor.groups.includes('Doctors') || actor.groups.includes('Admin');
}

function withCompliance(item, opts) {
    if (!opts?.dataClass) throw new Error('dataClass required');
    return {
        ...item,
        dataClass: opts.dataClass,
        createdAt: item.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        lastModifiedBy: opts.actor || 'system'
    };
}

function sha256(text) {
    return createHash('sha256').update(text).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────
// Bedrock — SOAP split prompt
// ─────────────────────────────────────────────────────────────────────

const SOAP_SYSTEM_PROMPT = `You are a clinical documentation assistant. You receive a raw transcript
of a doctor-patient consultation. Your task is to split it into a structured SOAP note.

Output STRICT JSON with exactly these keys:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "..."
}

Rules:
- Subjective = what the patient reports (symptoms, history, concerns).
- Objective = examination findings, vitals, observations, measurements.
- Assessment = the clinical impression or diagnosis the doctor stated.
- Plan = the next steps (medications, tests, follow-up, referrals).
- If a section has no content in the transcript, return an empty string for that section.
- Do NOT invent facts that aren't in the transcript.
- Preserve clinical terminology used by the doctor.
- Output JSON ONLY. No markdown fences, no commentary.`;

async function splitTranscriptToSoap(transcript) {
    const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        temperature: 0.0,
        system: SOAP_SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content: `Transcript:\n\n${transcript}\n\nReturn the SOAP JSON now.`
            }
        ]
    };

    const cmd = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
    });

    const response = await bedrock.send(cmd);
    const payload = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const text = payload?.content?.[0]?.text?.trim() ?? '';

    // Defensive parse — strip code fences if the model added them.
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        throw new Error('Bedrock returned non-JSON SOAP output: ' + text.slice(0, 200));
    }

    return {
        subjective: parsed.subjective || '',
        objective: parsed.objective || '',
        assessment: parsed.assessment || '',
        plan: parsed.plan || ''
    };
}

// ─────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────

async function createSession(event, actor, tenantId) {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return err('Invalid JSON body'); }

    if (!body.consentGiven) {
        return err('Patient consent must be confirmed before recording.', 400);
    }

    const sessionId = randomUUID();
    // Only include examId/patientId when provided. DynamoDB rejects items
    // whose attribute is NULL but participates in a GSI partition key
    // (PatientID-index uses patientId as PK).
    const baseItem = {
        PK: `SCRIBE#${sessionId}`,
        SK: 'SESSION',
        EntityType: 'SCRIBE_SESSION',
        tenantId, // Step 2d-4 — stamp on every new row
        sessionId,
        consentGiven: true,
        consentTimestamp: nowIso(),
        status: 'CREATED',
        startedBy: actor.email
    };
    if (body.examId) baseItem.examId = body.examId;
    if (body.patientId) baseItem.patientId = body.patientId;
    const item = withCompliance(baseItem, { dataClass: 'PHI', actor: actor.email });

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    return ok({ sessionId, status: 'CREATED' }, 201);
}

async function generateSoap(event, actor, tenantId) {
    const sessionId = event.pathParameters?.id;
    if (!sessionId) return err('Missing session id', 400);

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return err('Invalid JSON body'); }

    const transcript = (body.transcript || '').toString().trim();
    if (transcript.length < 20) {
        return err('Transcript too short — record at least a few sentences.', 400);
    }
    if (transcript.length > 50000) {
        return err('Transcript too long — split the consultation into multiple sessions.', 400);
    }

    // Verify session exists, belongs to this tenant, AND to this actor.
    const got = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `SCRIBE#${sessionId}`, SK: 'SESSION' }
    }));
    const session = got.Item;
    if (!session) return err('Session not found', 404);
    // Step 2d-4 — tenant guard before per-user check.
    assertRowTenant(session, tenantId, { notFoundMessage: 'Session not found' });
    if (session.startedBy !== actor.email && !actor.groups.includes('Admin')) {
        return err('Forbidden — session belongs to another doctor', 403);
    }

    let soap;
    try {
        soap = await splitTranscriptToSoap(transcript);
    } catch (e) {
        console.error('Bedrock SOAP split failed:', e);
        return err('SOAP generation failed: ' + e.message, 502);
    }

    // Persist transcript hash + SOAP draft on the session row.
    // Defensively re-stamp tenantId (Step 2d-4) in case the existing row
    // pre-dates Step 2d-4 and is missing it.
    const updated = withCompliance({
        ...session,
        tenantId,
        status: 'SOAP_GENERATED',
        transcriptDurationSec: Number(body.durationSec) || null,
        transcriptLength: transcript.length,
        transcriptSha256: sha256(transcript),
        soapDraft: soap
    }, { dataClass: 'PHI', actor: actor.email });

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));

    return ok({ sessionId, soap });
}

async function approveSession(event, actor, tenantId) {
    const sessionId = event.pathParameters?.id;
    if (!sessionId) return err('Missing session id', 400);

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return err('Invalid JSON body'); }

    const got = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `SCRIBE#${sessionId}`, SK: 'SESSION' }
    }));
    const session = got.Item;
    if (!session) return err('Session not found', 404);
    // Step 2d-4 — tenant guard before per-user check.
    assertRowTenant(session, tenantId, { notFoundMessage: 'Session not found' });
    if (session.startedBy !== actor.email && !actor.groups.includes('Admin')) {
        return err('Forbidden — session belongs to another doctor', 403);
    }

    const finalSoap = body.soap && typeof body.soap === 'object' ? body.soap : session.soapDraft;
    if (!finalSoap) return err('No SOAP content to approve', 400);

    const updated = withCompliance({
        ...session,
        tenantId, // Step 2d-4 defensive re-stamp
        status: 'APPROVED',
        approvedAt: nowIso(),
        approvedBy: actor.email,
        finalSoap,
        finalSoapSha256: sha256(JSON.stringify(finalSoap))
    }, { dataClass: 'PHI', actor: actor.email });

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));

    // Append-only audit row.
    const auditTs = nowIso();
    const auditBase = {
        PK: `SCRIBE#${sessionId}`,
        SK: `AUDIT#${auditTs}`,
        EntityType: 'AUDIT',
        tenantId, // Step 2d-4
        action: 'SCRIBE_APPROVED',
        actor: actor.email,
        sessionId,
        soapHash: updated.finalSoapSha256
    };
    if (session.examId) auditBase.examId = session.examId;
    if (session.patientId) auditBase.patientId = session.patientId;
    const auditRow = withCompliance(auditBase, { dataClass: 'AUDIT', actor: actor.email });

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: auditRow }));

    return ok({ sessionId, status: 'APPROVED', approvedAt: updated.approvedAt });
}

async function getSession(event, actor, tenantId) {
    const sessionId = event.pathParameters?.id;
    if (!sessionId) return err('Missing session id', 400);

    const got = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `SCRIBE#${sessionId}`, SK: 'SESSION' }
    }));
    const session = got.Item;
    if (!session) return err('Session not found', 404);
    // Step 2d-4 — tenant guard hides existence on cross-tenant probe.
    assertRowTenant(session, tenantId, { notFoundMessage: 'Session not found' });
    if (session.startedBy !== actor.email && !actor.groups.includes('Admin')) {
        return err('Forbidden', 403);
    }
    return ok({ session });
}

// ─────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    try {
        // Step 2d — tenant guard. Capture tenantId so we can pass it to
        // every handler (Step 2d-4) for row stamping + read enforcement.
        let tenantId;
        try { tenantId = getTenant(event); }
        catch (e) { return err(e.message, e.statusCode || 403); }

        // Step 2g — per-tenant throttle.
        {
            const role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
            const limitResponse = await throttle.precheck(event, { tenantId, role });
            if (limitResponse) return limitResponse;
        }

        const actor = getActor(event);
        if (!isDoctorOrAdmin(actor)) {
            return err('Forbidden — only doctors and admins can use the scribe', 403);
        }

        const route = event.routeKey || `${event.requestContext?.http?.method} ${event.rawPath}`;
        switch (route) {
            case 'POST /scribe/sessions':
                return await createSession(event, actor, tenantId);
            case 'POST /scribe/sessions/{id}/soap':
                return await generateSoap(event, actor, tenantId);
            case 'POST /scribe/sessions/{id}/approve':
                return await approveSession(event, actor, tenantId);
            case 'GET /scribe/sessions/{id}':
                return await getSession(event, actor, tenantId);
            default:
                return err(`Unknown route: ${route}`, 404);
        }
    } catch (e) {
        // Step 2d-4 — translate tenant-guard 404s without leaking the
        // cross-tenant attempt to the caller; log server-side for audit.
        if (e && e.statusCode === 404) {
            if (e.crossTenantAttempt) {
                console.warn('cross-tenant attempt', { route: event.routeKey, by: event.requestContext?.authorizer?.jwt?.claims?.email });
            }
            return err(e.message || 'Not found', 404);
        }
        console.error('akwadona-scribe handler error:', e);
        return err(e.message || 'Internal error', 500);
    }
};
// hash-bust 2026-06-21T13:57:58.1016493+03:00
// hash-bust 2026-06-21T14:07:44.7504132+03:00
// hash-bust 2026-06-21T14:14:23.7665133+03:00
// hash-bust 2026-06-21T14:28:24.0064697+03:00
// hash-bust 2d-4 2026-06-22T10:12:07.3705068+03:00
// hash-bust phase1 2026-06-23T12:29:38.1273700+03:00
