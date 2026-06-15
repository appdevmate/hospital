/**
 * Shared tenant-ID resolver used by every backfill script.
 *
 * tenantId is deterministic: `T_` + first 8 hex chars of
 *   SHA-256("AKWADONA_TENANT_" + slug)
 *
 * This means re-running any script will always produce the same ID,
 * so backfills are idempotent. Opaque (you cannot guess the slug
 * from the ID) and stable (the slug can change without breaking
 * stored references).
 *
 * To add a new customer:
 *   1. Pick a slug (lowercase, [a-z0-9-], short).
 *   2. Add it to TENANT_SLUGS below.
 *   3. Re-run scripts/backfill-create-tenants.js.
 */
const crypto = require('crypto');

const TENANT_SLUGS = ['tiryaq', 'alshifaa'];

function tenantIdFromSlug(slug) {
    return 'T_' + crypto
        .createHash('sha256')
        .update('AKWADONA_TENANT_' + slug)
        .digest('hex')
        .slice(0, 8);
}

const TENANTS = TENANT_SLUGS.map(slug => ({
    slug,
    tenantId: tenantIdFromSlug(slug)
}));

const TENANT_BY_SLUG = Object.fromEntries(TENANTS.map(t => [t.slug, t.tenantId]));

module.exports = { TENANT_SLUGS, TENANTS, TENANT_BY_SLUG, tenantIdFromSlug };
