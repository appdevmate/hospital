# ScribeFirst — AI Voice Scribe Feature for Tiryaq

**Document version:** 1.0
**Date:** 2026-04-30
**Owner:** Sami Taha
**Status:** Phase 1 build authorised
**Scope:** ScribeFirst feature only. Other documentation (AWS infra, user manuals) lives in separate docs.

---

## 1. The one-line pitch

A clinician speaks naturally with the patient. Tiryaq listens, transcribes the conversation in real time, and auto-fills the SOAP note. The doctor reviews and clicks Approve. No typing during the visit. No pajama time after.

---

## 2. The problem

| Pain point | Impact |
|------------|--------|
| Doctors spend 2 hours documenting for every 1 hour of care | Burnout, attrition |
| Eye contact is broken by typing during consultations | Poor patient experience |
| Notes are finished at home (pajama time) | Personal life disruption |
| SOAP, ICD-10, prescriptions, instructions all entered manually | Slow, error-prone |

**Existing EMRs** (Epic, Athena, NextGen) bolt AI on top of forms. ScribeFirst inverts that: the conversation IS the input, the structured note is the output.

---

## 3. Phased delivery plan

| Phase | Scope | Effort | Status |
|-------|-------|--------|--------|
| **1** | Live transcription → auto-fill SOAP fields. Doctor reviews and approves. | 1–2 weeks | **In progress** |
| 2 | Add Bedrock-generated ICD-10 diagnosis suggestions. | +1 week | Not started |
| 3 | Add draft prescriptions wired to existing Pharmacy module. | +1–2 weeks | Not started |
| 4 | Patient instructions + referral letters. | +1 week | Not started |

This document covers all four phases at the design level. Implementation in this iteration covers Phase 1 only.

---

## 4. User flow (Phase 1)

```
1. Doctor opens an existing or new Consultation in the Examinations module.
2. New "Voice Scribe" tab is visible alongside the SOAP form.
3. Doctor clicks Start Recording → mic permission requested by browser.
4. Doctor speaks normally with the patient.
5. Live transcript scrolls on screen as Transcribe Medical streams chunks back.
6. Doctor clicks Stop Recording when consultation is over.
7. Lambda processes the full transcript:
     - Splits into Subjective, Objective, Assessment, Plan
     - Returns the SOAP draft to the Angular client
8. Angular auto-fills the SOAP fields in the existing consultation form.
9. Doctor reviews, edits anything wrong, clicks Save & Sign-off.
10. The signed examination is stored in DynamoDB exactly as today
     (single-table design, EXAM# entity).
```

---

## 5. Technical architecture

### 5.1 High-level diagram

```
┌──────────────┐     WebSocket      ┌──────────────────────┐
│  Angular UI  │  audio chunks 16k  │  Amazon Transcribe   │
│  (Doctor)    │ ─────────────────▶ │  (Medical, streaming)│
│              │ ◀───────────────── │                      │
│              │  partial transcript└──────────────────────┘
│              │
│              │     HTTPS POST     ┌──────────────────────┐
│              │ ─────────────────▶ │  Lambda              │
│              │  (final transcript)│  tiryaq-scribe       │
│              │ ◀───────────────── │  - SOAP split        │
│              │   {subjective,     │  - ICD-10 (Phase 2)  │
│              │    objective, ...} │  - Bedrock client    │
│              │                    └──────────────────────┘
└──────────────┘                              │
                                              │ DynamoDB
                                              ▼
                                       ┌─────────────┐
                                       │  Hospital   │
                                       │  table      │
                                       │  (existing) │
                                       └─────────────┘
```

### 5.2 Why streaming Transcribe Medical (not S3 + batch)?

- **Doctors expect to see words appear as they speak.** Anything else feels broken.
- Streaming gives partial results in 200–400 ms; batch returns nothing until the audio is fully uploaded.
- Streaming requires no S3 storage of raw audio (good for PDPPL — audio is the most sensitive PHI artifact).
- Cost is identical (per-second billing) either way.

### 5.3 Audio capture in the browser

- HTML5 `MediaRecorder` API + `getUserMedia` → microphone audio.
- Encoded as **16 kHz mono PCM** (required by Transcribe Medical streaming).
- Streamed via **WebSocket** directly to the Transcribe endpoint, signed with **SigV4** using temporary credentials minted by Cognito.

### 5.4 Why direct browser → Transcribe (no Lambda proxy)?

- WebSocket streaming through a Lambda would double the latency and cost.
- Cognito identity pool can grant the doctor's browser temporary, scoped IAM credentials (only `transcribe:StartMedicalStreamTranscription`).
- The transcript final result is then POSTed to Lambda for SOAP split — small, batch-friendly, fits Lambda perfectly.

---

## 6. AWS services used (this feature only)

| Service | Purpose | Eligibility |
|---------|---------|-------------|
| **Amazon Transcribe Medical** | Speech-to-text optimised for clinical vocabulary | HIPAA-eligible. **Not yet in `me-south-1`.** Needs cross-region with documented basis (PDPPL Art. 25). For Phase 1 dev, use `us-east-1`. |
| **AWS Lambda** | SOAP split, future Bedrock calls | Existing in stack |
| **Amazon Bedrock** (Phase 2+) | ICD-10 suggestions, prescription drafts | Cross-region (`us-east-1` or `eu-west-1`) — same residency note as above |
| **Amazon Cognito Identity Pool** (NEW) | Mints temporary IAM creds for the browser to call Transcribe directly | Will be added to CDK |
| **DynamoDB Hospital table** | Stores the final examination exactly as today | Existing |

No new database, no new bucket, no new VPC. Minimal addition.

---

## 7. Data model additions (DynamoDB)

Single-table design preserved. New attributes on the existing `EXAM#` entity:

| Attribute | Type | Purpose |
|-----------|------|---------|
| `transcriptId` | String | Optional reference to the transcript artifact |
| `transcriptDurationSec` | Number | For billing visibility per visit |
| `scribeUsed` | Boolean | Audit flag — was AI used to draft this note? |
| `scribeApprovedAt` | String (ISO) | Timestamp when doctor clicked Approve |
| `scribeApprovedBy` | String (email) | Doctor who approved |
| `dataClass` | String | Already added (`PHI`) — see compliance Update 06 |

No new entity types. No new GSIs. Backward-compatible.

**Audit row** added per transcription session for traceability:

```
PK: EXAM#<examId>
SK: AUDIT#SCRIBE#<isoTimestamp>
EntityType: AUDIT
dataClass: AUDIT
actor: <doctor-email>
action: SCRIBE_APPROVED
transcriptDurationSec: 1234
soapHash: sha256(soap)
```

---

## 8. Compliance considerations (Phase 1)

| Concern | Mitigation |
|---------|------------|
| Audio leaves Qatar (Transcribe Medical not in me-south-1) | Document MOPH cross-border notice for dev environment. Switch to local provider when MENA region launches. |
| Patient consent for recording | Add explicit consent toggle on the Voice Scribe panel. Persisted on the consultation record. |
| Doctor liability for AI-generated text | UI design: SOAP fields are pre-filled but editable; nothing is auto-saved; explicit Approve action stamps actor + timestamp. |
| PHI in transit | Cognito temp creds + AWS-managed TLS to Transcribe. No third-party APIs. |
| Audit trail | Append-only `AUDIT#SCRIBE#*` row per session, plus existing CloudTrail capturing the Transcribe API call. |
| Data classification | Existing `dataClass: PHI` attribute applied to the examination row. |

These will be added to the compliance status doc (`02-Tiryaq-Compliance-Status.md`) after Phase 1 ships.

---

## 9. Cost estimate (Phase 1)

Assumptions: 20 visits/day × 15 minutes audio × 22 working days/month per doctor.

| Service | Unit cost | Per-doctor monthly | At 10 doctors |
|---------|-----------|-------------------|---------------|
| Transcribe Medical streaming | $0.075 / minute | 15 × 20 × 22 × $0.075 = $495 | $4,950 |
| Lambda (`tiryaq-scribe`) | $0.20 / 1M req + $0.0000166/GB-s | < $1 | < $10 |
| Cognito Identity Pool | Free | $0 | $0 |
| DynamoDB extra writes | $1.25 / 1M writes | < $1 | < $1 |
| **Phase 1 monthly total** | — | **~$497 / doctor** | **~$4,961** |

**Cost reality check.** $497/doctor/month is much higher than the originally pitched $99/month. Three options for production economics:

1. **Tiered pricing** — basic plan without Scribe at $99, Scribe add-on at $599.
2. **Per-minute pricing** — pass Transcribe cost through as $0.10/min visit.
3. **Bring our own model** — switch to Whisper on EC2 GPU later (~$0.005/min, 15× cheaper). 6+ months of work to do safely.

Recommendation: start with #1 + #2 hybrid, revisit #3 once we have 50+ active doctors.

---

## 10. UI changes (Angular)

New component: `src/app/components/consultation/voice-scribe/voice-scribe.component.ts`

| Element | Behaviour |
|---------|-----------|
| Consent checkbox | "Patient has consented to AI-assisted documentation" — required before recording starts |
| Mic button | Big green Start button → red Stop button while recording |
| Live transcript panel | Auto-scrolls; partial words shown in muted text, finalised words in normal text |
| Status pill | "Listening…", "Processing…", "Ready to review" |
| Auto-fill action | After transcript finishes, fields in the existing SOAP form are populated; each field highlighted yellow until the doctor clicks it |
| Approve & Sign-off | Existing button; now also writes the `scribeUsed` + audit row |

The existing SOAP form is not replaced — it is augmented. The doctor can still type or paste manually as before.

---

## 11. Open questions / decisions deferred

- Arabic/English bilingual support — Phase 5 (post-MVP). Transcribe Medical does not support Arabic medical vocabulary out of the box.
- Diarization (separating doctor voice from patient voice) — Transcribe supports it; we'll enable it in Phase 2.
- Offline mode (clinic Wi-Fi drops) — Phase 4. Out of scope now.

---

## 12. Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-30 | Sami Taha | Initial issuance |
