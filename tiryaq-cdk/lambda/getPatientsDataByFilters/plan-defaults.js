'use strict';

/**
 * Akwadona — Per-tenant plan default limits (Step 2g.1).
 *
 * Reference systems we mirror:
 *   - Stripe: 100 req/s baseline, raised by support per account.
 *   - Twilio: 100 req/s baseline, tier-scaled.
 *   - Vercel: Free 60/min, Pro 600/min, Enterprise 6000/min.
 *
 * Shape:
 *   rps          — soft per-second cap. Internally enforced as
 *                  `rps * 60` requests per rolling minute window so we
 *                  don't have to coordinate sub-second locks.
 *   dailyQuota   — hard cap on total authenticated requests per UTC day.
 *
 * A tenant's profile row CAN override either field via `limits.rps` /
 * `limits.dailyQuota` (operator console edit). The throttle module reads
 * the override first, then falls back to the plan default.
 */

const PLAN_DEFAULTS = Object.freeze({
    free: Object.freeze({
        rps:        10,        // → 600 req/min
        dailyQuota: 100_000
    }),
    standard: Object.freeze({
        rps:        100,       // → 6,000 req/min
        dailyQuota: 1_000_000
    }),
    enterprise: Object.freeze({
        rps:        500,       // → 30,000 req/min
        dailyQuota: 10_000_000
    }),
    // Future Premium Isolation tier — same software limits, dedicated
    // DynamoDB + IAM role provided separately.
    'enterprise-isolated': Object.freeze({
        rps:        500,
        dailyQuota: 10_000_000
    })
});

/**
 * Resolve the effective limits for a tenant profile row.
 * `profile.plan` selects the default tier.
 * `profile.limits.{rps,dailyQuota}` override the default per-field.
 */
function resolveLimits(profile) {
    const plan = (profile && profile.plan) || 'free';
    const base = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.free;
    const overrides = (profile && profile.limits) || {};
    return {
        rps:        Number.isFinite(overrides.rps)        ? overrides.rps        : base.rps,
        dailyQuota: Number.isFinite(overrides.dailyQuota) ? overrides.dailyQuota : base.dailyQuota,
        // Derived values used by the throttle module:
        rpm:        (Number.isFinite(overrides.rps) ? overrides.rps : base.rps) * 60
    };
}

module.exports = { PLAN_DEFAULTS, resolveLimits };
