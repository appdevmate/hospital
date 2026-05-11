# Compliance Update 06 — Data classification, retention TTL, and breach-scoping GSI

**Date:** 2026-04-29
**Author:** Sami Taha
**Severity addressed:** 🟡 Medium
**Obligations closed:** Matrix rows 11 (retention), 12 (classification)
**Gaps closed from status doc:** B.10, B.11, residual portion of B.12 (versioning was completed in Update 04)

---

## What was fixed

Nothing was *fixed* in this update — it adds capability. No previous behaviour was wrong.

---

## What was added

### 1. DynamoDB TTL attribute

- `timeToLiveAttribute: 'expiresAt'` enabled on the Hospital table.
- Items that include an `expiresAt` (Unix-epoch seconds in the future) are **automatically deleted by DynamoDB** at no cost, typically within 48 hours of expiry.
- Items without `expiresAt` are retained indefinitely (managed by retention policy in code, not by TTL).

### 2. New GSI: `dataClass-index`

- Partition key: `dataClass`, sort key: `updatedAt`, projection: `KEYS_ONLY`.
- Enables breach-scoping queries: *"list all PHI items modified between t1 and t2"* without a full table scan.
- This is GSI #7 — the GSI deployment-rule comment in the stack has been updated. **On a fresh deploy this lands cleanly. On an existing deployed table, this single GSI will be added as one CloudFormation update — within DynamoDB's "one GSI per update" limit.**

### 3. Shared compliance helper module

- New file: `tiryaq-cdk/lambda/_shared/compliance.js`.
- Exports:
  - `DATA_CLASS` enum: `PHI`, `PII`, `PUBLIC`, `AUDIT`, `SYSTEM`.
  - `RETENTION` schedule constants (PHI 10y, PII 3y, audit 7y).
  - `withCompliance(item, opts)` — wraps any DynamoDB item with `dataClass`, `createdAt`, `updatedAt`, optional `expiresAt`, optional `lastModifiedBy`.
  - `expiresInSeconds(n)` — convenience for setting TTL on transient items (sessions, locks).
  - `nowIso()`.

### Usage pattern (to be adopted incrementally)

Each Lambda handler that writes to DynamoDB should migrate from:

```js
await ddb.put({ TableName: TABLE, Item: { PK, SK, ...payload } });
```

to:

```js
const { withCompliance, DATA_CLASS } = require('../_shared/compliance');

await ddb.put({
    TableName: TABLE,
    Item: withCompliance(
        { PK, SK, EntityType: 'PATIENT', ...payload },
        { dataClass: DATA_CLASS.PHI, actor: callerEmail }
    )
});
```

For ephemeral items (idempotency keys, locks):

```js
const { withCompliance, DATA_CLASS, expiresInSeconds } = require('../_shared/compliance');

await ddb.put({
    TableName: TABLE,
    Item: withCompliance(
        { PK: 'LOCK#email', SK: emailValue },
        { dataClass: DATA_CLASS.SYSTEM, expiresAt: expiresInSeconds(60 * 5) }
    )
});
```

---

## Classification mapping (reference)

| Entity | dataClass |
|--------|-----------|
| `PATIENT` profile, examinations, prescriptions, lab results, surgeries | `PHI` |
| `DOCTOR` profile, staff records | `PII` |
| `DEPARTMENT`, `SPECIALIZATION` reference rows | `PUBLIC` |
| Audit log entries (`AUDIT#*`) | `AUDIT` |
| Counters, locks, idempotency keys | `SYSTEM` |

---

## What was NOT touched in this update

- Existing Lambda handlers have NOT been migrated to use `withCompliance()` — that is a follow-up sprint per module (createPatient, createDoctor, examinations, pharmacy, audit, etc.).
- Multi-tenant `tenantId` partition prefix — deferred to its own design doc.
- Breach SNS pipeline that consumes `dataClass-index` — deferred to Phase 2.

---

## Operational impact

- The new GSI adds storage and write cost on every item update. With `KEYS_ONLY` projection and PAY_PER_REQUEST billing, the marginal cost on Tiryaq's volume is negligible (< $1/month).
- TTL is not retroactive — existing items have no `expiresAt` and will not be deleted until you set one explicitly.

---

## How to verify

```bash
# 1. TTL enabled
aws dynamodb describe-time-to-live --table-name Hospital --region me-south-1
# expect: TimeToLiveStatus=ENABLED, AttributeName=expiresAt

# 2. New GSI exists
aws dynamodb describe-table --table-name Hospital --region me-south-1 \
  --query "Table.GlobalSecondaryIndexes[?IndexName=='dataClass-index']"
# expect: a non-empty array

# 3. Helper module shipped with at least one Lambda artifact
ls tiryaq-cdk/lambda/_shared/compliance.js
```

---

## Rollback

- Removing the GSI requires another single-GSI CloudFormation update.
- Disabling TTL is safe and instantaneous.
- The `_shared/compliance.js` module is untouched code until adopted by a handler — removing it is harmless.
