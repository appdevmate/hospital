/**
 * Akwadona — PHI envelope encryption helper (Step 3).
 *
 * MASTER COPY. Synced into each Lambda folder by
 * `scripts/sync-shared-helpers.js` so each Lambda can `require('./crypto')`.
 * Do NOT edit the per-Lambda copies — they will be overwritten on next sync.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why envelope encryption (not direct KMS encryption per field)
 * ─────────────────────────────────────────────────────────────────────────────
 * KMS direct encryption is limited to 4 KB per call and costs $0.03 per
 * 10,000 requests. For a patient row with 8 PHI fields, that would be 8
 * KMS round-trips per write — slow and expensive.
 *
 * Envelope encryption:
 *   1. Ask KMS for a single Data Encryption Key (DEK) once per row.
 *   2. Use that DEK to AES-256-GCM encrypt each PHI field locally.
 *   3. Store the DEK encrypted with the tenant's KMS key, alongside the row.
 *
 * Read path is symmetric: one KMS Decrypt per row to recover the DEK,
 * then local AES decrypt per field.
 *
 * Result: ~1 KMS call per item regardless of PHI field count.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Item shape on DynamoDB after encryption
 * ─────────────────────────────────────────────────────────────────────────────
 *   PK:          PATIENT#abc-123
 *   SK:          PROFILE
 *   EntityType:  PATIENT
 *   tenantId:    T_2572fc71
 *   name:        "AQICAH..."         ← base64 ciphertext
 *   dob:         "AQICAH..."
 *   qid:         "AQICAH..."
 *   ...
 *   _kms_dek:    "AQECAH..."         ← base64 of KMS-encrypted DEK
 *   _kms_v:      1                   ← format version (for future migration)
 *
 * Non-PHI fields (PK, SK, EntityType, tenantId, audit timestamps) are
 * NEVER encrypted — they are needed for DynamoDB queries.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-knowledge guarantee
 * ─────────────────────────────────────────────────────────────────────────────
 * The plaintext DEK lives ONLY in this Lambda's memory during the request.
 * It is never written to DynamoDB, CloudWatch, or anywhere persistent.
 * The Lambda's execution role can `kms:Decrypt` the wrapped DEK, but only
 * because the per-tenant KMS key policy whitelists it via PrincipalArn.
 * No human IAM principal has decrypt — including the developer, the
 * deploy user, and any future operator console role.
 */

'use strict';

const crypto = require('crypto');
const { KMSClient, GenerateDataKeyCommand, DecryptCommand, GenerateMacCommand } = require('@aws-sdk/client-kms');

const REGION   = process.env.AWS_REGION || 'us-east-1';
const KEY_SPEC = 'AES_256';
const ALGORITHM = 'aes-256-gcm';
const VERSION  = 1;

const DEK_FIELD     = '_kms_dek';   // base64 KMS-encrypted DEK
const VERSION_FIELD = '_kms_v';     // format version, currently 1

const kms = new KMSClient({ region: REGION });

// Parse TENANT_KEYS once and cache. Env var is JSON: { "T_xxx": "arn:..." }
let _tenantKeys = null;
function _tenantKeyMap() {
    if (_tenantKeys) return _tenantKeys;
    try { _tenantKeys = JSON.parse(process.env.TENANT_KEYS || '{}'); }
    catch (_) { _tenantKeys = {}; }
    return _tenantKeys;
}

/** Return the KMS key ARN for a tenant. Throws if unknown tenant. */
function keyArnForTenant(tenantId) {
    const arn = _tenantKeyMap()[tenantId];
    if (!arn) {
        const e = new Error(`No KMS key configured for tenant ${tenantId}`);
        e.statusCode = 500;
        throw e;
    }
    return arn;
}

/** Generate a fresh DEK from KMS. Returns { plaintextDek, encryptedDek } as Buffers. */
async function generateDek(tenantId) {
    const KeyId = keyArnForTenant(tenantId);
    const r = await kms.send(new GenerateDataKeyCommand({ KeyId, KeySpec: KEY_SPEC }));
    return {
        plaintextDek: Buffer.from(r.Plaintext),
        encryptedDek: Buffer.from(r.CiphertextBlob)
    };
}

/** Decrypt a wrapped DEK via KMS. Returns Buffer(32). */
async function decryptDek(encryptedDek, tenantId) {
    const KeyId = keyArnForTenant(tenantId);
    const r = await kms.send(new DecryptCommand({
        CiphertextBlob: encryptedDek,
        KeyId
    }));
    return Buffer.from(r.Plaintext);
}

/**
 * AES-256-GCM encrypt a single string. Returns base64 of `iv(12) || tag(16) || ct`.
 * Non-string inputs (numbers, objects) are JSON-stringified first so we can
 * round-trip them through decrypt.
 */
function aesEncrypt(plaintext, dek) {
    if (plaintext === null || plaintext === undefined) return null;
    const str = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
    const ct = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]).toString('base64');
}

/** AES-256-GCM decrypt. Input must be base64 of `iv(12) || tag(16) || ct`. */
function aesDecrypt(b64, dek) {
    if (b64 === null || b64 === undefined) return null;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 28) {
        // Too short to be valid ciphertext — likely legacy plaintext.
        const e = new Error('aesDecrypt: input too short');
        e.code = 'NOT_CIPHERTEXT';
        throw e;
    }
    const iv  = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct  = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
}

/**
 * Encrypt the named fields in `item` in place. Adds `_kms_dek` and `_kms_v`.
 * If `_kms_dek` already exists, the existing DEK is reused (re-encryption with
 * new IVs per field).
 */
async function encryptItem(item, fieldNames, tenantId) {
    if (!item || !fieldNames || !fieldNames.length) return item;
    if (!tenantId) {
        const e = new Error('encryptItem: tenantId is required'); e.statusCode = 500; throw e;
    }

    let dek, encryptedDek;
    if (item[DEK_FIELD]) {
        encryptedDek = Buffer.from(item[DEK_FIELD], 'base64');
        dek = await decryptDek(encryptedDek, tenantId);
    } else {
        const fresh = await generateDek(tenantId);
        dek = fresh.plaintextDek;
        encryptedDek = fresh.encryptedDek;
    }

    try {
        for (const f of fieldNames) {
            if (item[f] !== undefined && item[f] !== null && item[f] !== '') {
                item[f] = aesEncrypt(item[f], dek);
            }
        }
        item[DEK_FIELD] = encryptedDek.toString('base64');
        item[VERSION_FIELD] = VERSION;
        return item;
    } finally {
        if (dek) dek.fill(0);  // best-effort wipe
    }
}

/**
 * Decrypt the named fields in `item` in place. Removes `_kms_dek` and `_kms_v`.
 * If `_kms_dek` is absent, returns the item untouched — legacy plaintext rows
 * remain readable during the backfill window.
 *
 * Per-field errors are tolerated: a field that fails decrypt (e.g. legacy
 * plaintext mixed with new ciphertext) is left as-is so the rest of the
 * item still returns useful data.
 */
async function decryptItem(item, fieldNames, tenantId) {
    if (!item || !item[DEK_FIELD]) return item;
    if (!tenantId) {
        const e = new Error('decryptItem: tenantId is required'); e.statusCode = 500; throw e;
    }
    const encryptedDek = Buffer.from(item[DEK_FIELD], 'base64');
    const dek = await decryptDek(encryptedDek, tenantId);
    try {
        for (const f of fieldNames) {
            if (item[f] !== undefined && item[f] !== null && typeof item[f] === 'string') {
                try { item[f] = aesDecrypt(item[f], dek); }
                catch (_) { /* leave as-is */ }
            }
        }
        delete item[DEK_FIELD];
        delete item[VERSION_FIELD];
        return item;
    } finally {
        if (dek) dek.fill(0);
    }
}

/**
 * Decrypt a list of items in parallel. Same DEK is decrypted per item
 * (one KMS call per item). For very large lists, callers should consider
 * caching DEKs by their ciphertext.
 */
async function decryptItems(items, fieldNames, tenantId) {
    if (!items || !items.length) return items;
    return Promise.all(items.map(it => decryptItem(it, fieldNames, tenantId)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — HMAC-hashed search fields.
//
// PHI fields encrypted by Step 3 cannot be queried by equality because every
// write uses a fresh IV. To restore "find by QID / email / phone", we store
// an HMAC-SHA256 hash alongside the ciphertext. The hash is:
//   - Deterministic per (tenant, plaintext) — same input → same hash.
//   - One-way — cannot be reversed to recover the plaintext.
//   - Tenant-scoped — different tenants produce different hashes for the
//     same input (because they use different KMS HMAC keys).
//
// The KMS GenerateMac API runs the HMAC inside the FIPS-validated HSM —
// the HMAC key never leaves AWS. Even a fully compromised Lambda cannot
// produce hashes for arbitrary inputs after losing IAM permission.
//
// Cache hashes in memory: same input + same tenant always produces the
// same hash, so caching is safe and avoids extra KMS calls.
// ─────────────────────────────────────────────────────────────────────────────

let _tenantHmacKeys = null;
function _tenantHmacKeyMap() {
    if (_tenantHmacKeys) return _tenantHmacKeys;
    try { _tenantHmacKeys = JSON.parse(process.env.TENANT_HMAC_KEYS || '{}'); }
    catch (_) { _tenantHmacKeys = {}; }
    return _tenantHmacKeys;
}

function hmacKeyArnForTenant(tenantId) {
    const arn = _tenantHmacKeyMap()[tenantId];
    if (!arn) {
        const e = new Error(`No KMS HMAC key configured for tenant ${tenantId}`);
        e.statusCode = 500;
        throw e;
    }
    return arn;
}

// In-memory LRU-ish cache of (tenantId|value) → MAC. Bounded so a Lambda
// instance can't grow unboundedly while reusing across invocations.
const _hmacCache = new Map();
const HMAC_CACHE_MAX = 5000;

/**
 * Normalize a string for hashing: trim + lowercase. Apply the same
 * normalization at lookup time to match. Pure ASCII whitespace + case
 * normalization — does not change digits / Unicode codepoints.
 */
function normalizeForHash(v) {
    if (v === null || v === undefined || v === '') return null;
    return typeof v === 'string' ? v.trim().toLowerCase() : String(v);
}

/**
 * Compute HMAC-SHA256(value) for a tenant. Returns base64 string suitable
 * for DynamoDB partition key.
 */
async function computeHmac(value, tenantId) {
    const norm = normalizeForHash(value);
    if (!norm) return null;

    const cacheKey = `${tenantId}|${norm}`;
    if (_hmacCache.has(cacheKey)) return _hmacCache.get(cacheKey);

    const KeyId = hmacKeyArnForTenant(tenantId);
    const r = await kms.send(new GenerateMacCommand({
        KeyId,
        MacAlgorithm: 'HMAC_SHA_256',
        Message: Buffer.from(norm, 'utf8')
    }));
    const mac = Buffer.from(r.Mac).toString('base64');

    // Bounded — evict the oldest entry once full. Map iteration is in
    // insertion order so this is effectively LRU on writes (good enough).
    if (_hmacCache.size >= HMAC_CACHE_MAX) {
        const firstKey = _hmacCache.keys().next().value;
        _hmacCache.delete(firstKey);
    }
    _hmacCache.set(cacheKey, mac);
    return mac;
}

/**
 * Given an item and a field map `{sourceField: hashFieldName}`, compute
 * the hashes from the plaintext source values and assign them onto the
 * item under the hash field names.
 *
 * Example:
 *   await stampHashes(patientItem, PATIENT_HASH_FIELDS, tenantId);
 *   // → patientItem.qidHash, patientItem.emailHash, patientItem.phoneHash
 *
 * Call BEFORE encryptItem() — otherwise the source values are already
 * ciphertext and the hash would be useless.
 */
async function stampHashes(item, fieldMap, tenantId) {
    if (!item || !fieldMap) return item;
    for (const [src, hashField] of Object.entries(fieldMap)) {
        const v = item[src];
        if (v !== undefined && v !== null && v !== '') {
            item[hashField] = await computeHmac(v, tenantId);
        }
    }
    return item;
}

// Standard source-field → hash-field maps per entity. Add new entries
// here whenever a new PHI lookup is needed.
const PATIENT_HASH_FIELDS = {
    qid:   'qidHash',
    email: 'emailHash',
    phone: 'phoneHash'
};

const DOCTOR_HASH_FIELDS = {
    qid:   'qidHash',
    email: 'emailHash',
    phone: 'phoneHash'
};

// ── Standard PHI field lists by entity type ─────────────────────────────────
// Applied uniformly across Lambdas. Adding a new sensitive field?  Add it
// here and the next deploy will start encrypting it. Backfill needed for
// existing rows.

const PATIENT_PHI_FIELDS = [
    'name', 'dob', 'qid', 'phone', 'email',
    'medicalHistory', 'notes', 'allergies', 'medications', 'bloodGroup'
];

const DOCTOR_PHI_FIELDS = [
    'name', 'dob', 'qid', 'phone', 'email',
    'licenseNumber', 'education', 'notes'
];

const APPOINTMENT_PHI_FIELDS = [
    'chiefComplaint', 'notes', 'cancelReason'
];

const EXAMINATION_PHI_FIELDS = [
    'notes', 'diagnosis', 'findings', 'prescription_text', 'chiefComplaint'
];

const AUDIT_PHI_FIELDS = ['before', 'after'];

module.exports = {
    // Core encryption (Step 3)
    encryptItem,
    decryptItem,
    decryptItems,
    aesEncrypt,
    aesDecrypt,
    generateDek,
    decryptDek,
    keyArnForTenant,
    // Hashed search (Step 4)
    computeHmac,
    stampHashes,
    normalizeForHash,
    hmacKeyArnForTenant,
    // Constants
    DEK_FIELD,
    VERSION_FIELD,
    VERSION,
    // Standard PHI field lists
    PATIENT_PHI_FIELDS,
    DOCTOR_PHI_FIELDS,
    APPOINTMENT_PHI_FIELDS,
    EXAMINATION_PHI_FIELDS,
    AUDIT_PHI_FIELDS,
    // Hash-field maps
    PATIENT_HASH_FIELDS,
    DOCTOR_HASH_FIELDS
};
