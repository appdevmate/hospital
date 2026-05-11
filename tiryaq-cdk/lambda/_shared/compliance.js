// ─────────────────────────────────────────────────────────────────────
// Tiryaq compliance helpers — applied to every DynamoDB write.
//
// Why this module exists:
// PDPPL Art. 7 (storage limitation) + NCSA NIA (data classification)
// require every record we store to be:
//   1. classified by sensitivity, and
//   2. either retained according to a documented schedule or auto-expired.
//
// Every Lambda that writes to the Hospital table SHOULD wrap its item
// payload with `withCompliance()` instead of inserting raw objects.
//
// Usage:
//   const { withCompliance, DATA_CLASS, RETENTION } = require('../_shared/compliance');
//   const item = withCompliance({
//       PK: `PATIENT#${id}`,
//       SK: 'PROFILE',
//       EntityType: 'PATIENT',
//       name, qid, phone
//   }, { dataClass: DATA_CLASS.PHI });
// ─────────────────────────────────────────────────────────────────────

'use strict';

const DATA_CLASS = Object.freeze({
    PHI:    'PHI',     // Protected Health Information — clinical/medical data tied to a patient.
    PII:    'PII',     // Personally Identifiable Information without medical context.
    PUBLIC: 'PUBLIC',  // Reference data — departments, specializations, code lookups.
    AUDIT:  'AUDIT',   // Audit trail entries — append-only, immutable.
    SYSTEM: 'SYSTEM'   // Counters, locks, idempotency keys, transient bookkeeping.
});

// Retention schedule in days. Source: PDPPL Art. 7 + Qatar healthcare
// records norms. Adjust only with legal review.
const RETENTION = Object.freeze({
    PHI_YEARS_10: 3650,   // Patient clinical records — 10 years post last visit (Qatar norm).
    PII_YEARS_3:  1095,   // Operational PII (staff records after departure).
    AUDIT_YEARS_7: 2555,  // Aligns with audit S3 bucket Object Lock.
    SESSION_HOURS_24: null, // Use `expiresInSeconds(60*60*24)` directly.
    LOCK_MINUTES_5: null
});

function nowIso() {
    return new Date().toISOString();
}

function expiresInSeconds(seconds) {
    return Math.floor(Date.now() / 1000) + seconds;
}

/**
 * Wrap a DynamoDB item with mandatory compliance attributes.
 *
 * @param {object} item              The raw item.
 * @param {object} opts
 * @param {string} opts.dataClass    One of DATA_CLASS.*
 * @param {number} [opts.expiresAt]  Unix-epoch seconds. Used by DynamoDB TTL.
 *                                   Pass for transient items (sessions, locks,
 *                                   idempotency keys). Omit for long-lived items.
 * @param {string} [opts.actor]      Email of the user performing the write
 *                                   (sourced from the JWT in the API event).
 * @returns {object} item + compliance fields.
 */
function withCompliance(item, opts) {
    if (!opts || !opts.dataClass) {
        throw new Error('withCompliance: opts.dataClass is required.');
    }
    if (!Object.values(DATA_CLASS).includes(opts.dataClass)) {
        throw new Error(`withCompliance: unknown dataClass "${opts.dataClass}".`);
    }
    const now = nowIso();
    const result = {
        ...item,
        dataClass: opts.dataClass,
        createdAt: item.createdAt ?? now,
        updatedAt: now
    };
    if (typeof opts.expiresAt === 'number') {
        result.expiresAt = opts.expiresAt;
    }
    if (opts.actor) {
        result.lastModifiedBy = opts.actor;
    }
    return result;
}

module.exports = {
    DATA_CLASS,
    RETENTION,
    withCompliance,
    expiresInSeconds,
    nowIso
};
