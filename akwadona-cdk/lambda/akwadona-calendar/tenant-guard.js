/**
 * Akwadona — Per-row tenant enforcement helper (Step 2d-4).
 *
 * MASTER COPY. Synced into each big-domain Lambda folder by
 * `scripts/sync-shared-helpers.js` so each Lambda can `require('./tenant-guard')`.
 * Do NOT edit the per-Lambda copies — they will be overwritten on next sync.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why this module exists
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 2d already establishes the rule "every Lambda reads `tenantId` from
 * the JWT and stamps it on writes". Step 2d-4 closes the last gap:
 *
 *   The "fat" domain Lambdas (bloodbank, pharmacy, calendar, examinations,
 *   scribe, document-manager) do many GetItem-by-id and UpdateItem-by-id
 *   operations. If a user from Tenant A guesses or steals an id from
 *   Tenant B, a naive `GetCommand({ Key: { PK: 'PATIENT#xyz' } })` would
 *   happily return that row, because DynamoDB does not know which tenant
 *   the JWT belongs to.
 *
 *   This module provides two guards used on EVERY by-id operation:
 *
 *     assertRowTenant(row, callerTenantId)
 *       For reads: throws a 404 if the row's `tenantId` does not match
 *       the JWT's tenantId. We return 404 (not 403) so an attacker can't
 *       even confirm that a given id exists in another tenant.
 *
 *     tenantCondition(callerTenantId)
 *       For writes: returns a ConditionExpression fragment that lets
 *       DynamoDB itself reject the write atomically if the row's
 *       `tenantId` doesn't match. This is the "belt-and-suspenders" guard
 *       that survives even race conditions where the read returned the
 *       wrong row.
 *
 *     mergeTenantCondition(existing, callerTenantId)
 *       Combines a tenant guard with any condition the Lambda was already
 *       sending (e.g. `attribute_exists(PK)`) via AND.
 *
 * This matches the per-row authorization pattern used by Stripe (every
 * read filters on `account_id`), Athenahealth (per-practice row guards),
 * and Salesforce Multi-Tenant Records (Org-Id row filter).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 404 vs 403 — why we hide existence
 * ─────────────────────────────────────────────────────────────────────────────
 * Returning 403 on a cross-tenant read leaks the fact that an id exists
 * somewhere on the platform. Returning 404 makes the response identical
 * to "no such row anywhere", which is the OWASP recommendation for
 * multi-tenant authorization (A01:2021 — Broken Access Control).
 */
'use strict';

/**
 * Read-side guard. Call after every GetCommand by id.
 *
 *   const row = (await ddb.send(new GetCommand({ ... }))).Item;
 *   assertRowTenant(row, tenantId);                  // throws if mismatch
 *
 * @param {object|undefined} row              The DynamoDB Item or undefined.
 * @param {string}           callerTenantId   The JWT's tenantId.
 * @param {object}           [opts]           Optional overrides.
 * @param {string}           [opts.notFoundMessage='Not found']
 * @throws {Error & { statusCode: 404 }}      When row is missing or owned
 *                                            by a different tenant.
 */
function assertRowTenant(row, callerTenantId, opts) {
    const message = (opts && opts.notFoundMessage) || 'Not found';
    if (!row || row.tenantId !== callerTenantId) {
        const err = new Error(message);
        err.statusCode = 404;
        // Tag so audit middleware can record a cross-tenant attempt without
        // exposing it in the HTTP response body.
        err.crossTenantAttempt = !!row && row.tenantId && row.tenantId !== callerTenantId;
        throw err;
    }
    return row;
}

/**
 * Write-side guard. Returns a ConditionExpression fragment ready to merge
 * into an UpdateCommand / DeleteCommand / PutCommand input.
 *
 *   const cond = tenantCondition(tenantId);
 *   await ddb.send(new UpdateCommand({
 *       Key, UpdateExpression: 'SET #n = :n',
 *       ConditionExpression: cond.ConditionExpression,
 *       ExpressionAttributeNames: { '#n': 'name', ...cond.ExpressionAttributeNames },
 *       ExpressionAttributeValues: { ':n': 'x', ...cond.ExpressionAttributeValues }
 *   }));
 *
 * The Lambda must catch `ConditionalCheckFailedException` from DynamoDB
 * and translate it to a 404 (same reason as assertRowTenant — hide
 * existence). The Lambda should also distinguish this from a 404 caused
 * by the row simply not existing (caller's responsibility — usually a
 * preceding GetItem already proved existence).
 *
 * @param {string} callerTenantId  The JWT's tenantId.
 * @returns {{
 *   ConditionExpression: string,
 *   ExpressionAttributeNames: { '#tenantId': 'tenantId' },
 *   ExpressionAttributeValues: { ':__callerTenantId': string }
 * }}
 */
function tenantCondition(callerTenantId) {
    return {
        ConditionExpression: '#tenantId = :__callerTenantId',
        ExpressionAttributeNames: { '#tenantId': 'tenantId' },
        ExpressionAttributeValues: { ':__callerTenantId': callerTenantId }
    };
}

/**
 * Merge a tenant condition with any existing ConditionExpression and its
 * names/values. Use when the Lambda was already sending its own condition
 * (e.g. `attribute_exists(PK)`, `#status <> :cancelled`, optimistic locks).
 *
 * @param {object} existing          Optional existing condition payload.
 * @param {string} [existing.ConditionExpression]
 * @param {object} [existing.ExpressionAttributeNames]
 * @param {object} [existing.ExpressionAttributeValues]
 * @param {string} callerTenantId    The JWT's tenantId.
 * @returns {{
 *   ConditionExpression: string,
 *   ExpressionAttributeNames: object,
 *   ExpressionAttributeValues: object
 * }}
 */
function mergeTenantCondition(existing, callerTenantId) {
    const guard = tenantCondition(callerTenantId);
    const cond = (existing && existing.ConditionExpression)
        ? `(${existing.ConditionExpression}) AND (${guard.ConditionExpression})`
        : guard.ConditionExpression;
    return {
        ConditionExpression: cond,
        ExpressionAttributeNames: {
            ...((existing && existing.ExpressionAttributeNames) || {}),
            ...guard.ExpressionAttributeNames
        },
        ExpressionAttributeValues: {
            ...((existing && existing.ExpressionAttributeValues) || {}),
            ...guard.ExpressionAttributeValues
        }
    };
}

/**
 * Translate a DynamoDB ConditionalCheckFailedException to a 404 response.
 * Re-throws anything else unchanged.
 *
 *   try {
 *       await ddb.send(new UpdateCommand({ ..., ...tenantCondition(tenantId) }));
 *   } catch (err) {
 *       throwAs404IfCrossTenant(err);
 *       throw err;
 *   }
 *
 * @param {any} err
 * @throws {Error & { statusCode: 404 }} When err is a conditional check fail.
 */
function throwAs404IfCrossTenant(err) {
    const name = err && (err.name || err.__type || (err.$metadata && err.$metadata.errorCode));
    if (name && String(name).includes('ConditionalCheckFailed')) {
        const out = new Error('Not found');
        out.statusCode = 404;
        out.crossTenantAttempt = true;
        throw out;
    }
}

module.exports = {
    assertRowTenant,
    tenantCondition,
    mergeTenantCondition,
    throwAs404IfCrossTenant
};
