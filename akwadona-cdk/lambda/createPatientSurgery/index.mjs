// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
// Stub Lambda — not implemented yet. When implemented, follow the standard
// pattern: stamp tenantId on writes, ConditionExpression tenantId on update/
// delete, scope reads via tenant-entityType-index. See _shared/tenant.js.
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

export const handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  try { getTenant(event); }
  catch (e) {
    return {
      statusCode: e.statusCode || 403,
      body: JSON.stringify({ message: e.message })
    };
  }

  // TODO implement — keep tenant scope when adding real logic.
  return {
    statusCode: 501,
    body: JSON.stringify({ message: 'Not implemented' })
  };
};
