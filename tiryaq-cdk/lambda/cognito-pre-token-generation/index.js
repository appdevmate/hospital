/**
 * Cognito Pre-Token-Generation Lambda — V3_0 trigger.
 *
 * Runs every time a user logs in (or refreshes a token). Cognito hands us
 * the user's stored attributes; we choose which ones to inject into the
 * Access Token + ID Token as JWT claims.
 *
 * Claims injected:
 *   - email             → from standard attribute `email`
 *   - name              → from standard attribute `name`
 *   - tenantId          → from custom attribute `custom:tenantId`  (Step 2)
 *
 * `tenantId` is the opaque hospital-customer ID (e.g. T_a1b2c3d4). Every
 * backend Lambda reads it from the JWT to scope DynamoDB queries to that
 * customer's rows only. This is the security boundary for multi-tenancy —
 * Lambdas never trust a tenantId from the request body, only from the
 * JWT, because the JWT is cryptographically signed by Cognito.
 *
 * Safety:
 *   - If a user has no `custom:tenantId` (e.g. legacy users before backfill
 *     runs), we DO NOT block login — we inject `tenantId = "UNASSIGNED"`
 *     and let downstream Lambdas decide how to handle it (current default:
 *     return 403 for any data operation). This lets backfill run while the
 *     pool is live, without locking everyone out.
 */
exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    const attrs = (event && event.request && event.request.userAttributes) || {};

    // Cognito stores custom attributes under "custom:<name>".
    const tenantId = attrs['custom:tenantId'] || 'UNASSIGNED';

    const claimsToAddOrOverride = {
        email:    attrs.email || '',
        name:     attrs.name  || '',
        tenantId: tenantId
    };

    event.response = {
        claimsAndScopeOverrideDetails: {
            accessTokenGeneration: {
                claimsToAddOrOverride
            },
            idTokenGeneration: {
                claimsToAddOrOverride
            }
        }
    };

    return event;
};
