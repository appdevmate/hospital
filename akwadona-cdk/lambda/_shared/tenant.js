/**
 * Akwadona — Tenant enforcement helper (Step 2d).
 *
 * REFERENCE COPY ONLY. Each Lambda inlines the `getTenant` function inside
 * its own index.js because CDK packages each Lambda's folder separately
 * with `lambda.Code.fromAsset('lambda/<folder>')`. `require('../_shared/...')`
 * fails at runtime — the _shared folder is NOT bundled with the Lambda.
 *
 * Why the JWT is the source of truth:
 *   The frontend cannot be trusted to send a correct tenantId in a
 *   request body. Cognito signs the JWT, the JWT carries
 *   `tenantId` (injected by the pre-token-generation Lambda), and API
 *   Gateway's JWT authorizer validates the signature before any Lambda
 *   runs. So reading `tenantId` from claims is cryptographically safe.
 *
 * If a user has no `custom:tenantId` set (legacy users not yet backfilled),
 * the pre-token Lambda injects `tenantId="UNASSIGNED"`. We reject those
 * here so accidentally-pre-backfill traffic cannot read any tenant's data.
 *
 * Usage (inline in each Lambda):
 *
 *   function getTenant(event) {
 *       const claims = event.requestContext?.authorizer?.jwt?.claims
 *                   || event.requestContext?.authorizer?.claims
 *                   || {};
 *       const tenantId = claims.tenantId || claims['custom:tenantId'];
 *       if (!tenantId || tenantId === 'UNASSIGNED') {
 *           const err = new Error('Tenant not assigned for this user');
 *           err.statusCode = 403;
 *           throw err;
 *       }
 *       return tenantId;
 *   }
 *
 *   exports.handler = async (event) => {
 *       if (event && event._warmup) return { ok: true, warmed: true };
 *       try {
 *           const tenantId = getTenant(event);
 *           // ... use tenantId everywhere
 *       } catch (err) {
 *           if (err.statusCode === 403) {
 *               return { statusCode: 403, headers: cors, body: JSON.stringify({ message: err.message }) };
 *           }
 *           throw err;
 *       }
 *   };
 *
 * Enforcement rules per operation:
 *
 *   CREATE:
 *     - Stamp `tenantId: tenantId` on every new item.
 *
 *   READ (list):
 *     - Query `tenant-entityType-index` with PK=tenantId, SK=EntityType.
 *     - Never read another tenant's rows.
 *
 *   READ (by id):
 *     - GetItem, then `if (item.tenantId !== tenantId) return 404`.
 *     - 404 (not 403) to avoid leaking existence of other-tenant data.
 *
 *   UPDATE / DELETE:
 *     - GetItem first, verify tenantId match, then proceed.
 *     - ConditionExpression `tenantId = :t` on the write as a double-check.
 *
 *   SOFT DELETE:
 *     - Same as UPDATE — tenant verification required.
 */
'use strict';

function getTenant(event) {
    const claims = (event && event.requestContext && event.requestContext.authorizer
                    && (event.requestContext.authorizer.jwt
                        ? event.requestContext.authorizer.jwt.claims
                        : event.requestContext.authorizer.claims))
                || {};
    const tenantId = claims.tenantId || claims['custom:tenantId'];
    if (!tenantId || tenantId === 'UNASSIGNED') {
        const err = new Error('Tenant not assigned for this user');
        err.statusCode = 403;
        throw err;
    }
    return tenantId;
}

module.exports = { getTenant };
