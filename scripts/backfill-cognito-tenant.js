/**
 * Step 2c — Set `custom:tenantId` on every existing Cognito user.
 *
 * All current users belong to Tiryaq Hospital, so every user gets
 * `custom:tenantId = T_<tiryaq-id>` unless they already have one set.
 *
 * Idempotent: re-reads the current attribute and only updates if missing
 * or empty.
 *
 * Usage:
 *   cd scripts
 *   node backfill-cognito-tenant.js
 *   node backfill-cognito-tenant.js --dry-run
 *   node backfill-cognito-tenant.js --user-pool-id us-east-1_RACghntmS
 */
const {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminUpdateUserAttributesCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const { TENANT_BY_SLUG } = require('./lib/tenant-ids');

const REGION = 'us-east-1';
const DRY_RUN = process.argv.includes('--dry-run');

// Defaults to the current pool from CloudFormation outputs; can be overridden.
const argIdx = process.argv.indexOf('--user-pool-id');
const USER_POOL_ID = argIdx > -1 ? process.argv[argIdx + 1] : 'us-east-1_RACghntmS';

const TARGET_TENANT_ID = TENANT_BY_SLUG.tiryaq;

const cognito = new CognitoIdentityProviderClient({ region: REGION });

async function* allUsers() {
    let token;
    do {
        const r = await cognito.send(new ListUsersCommand({
            UserPoolId: USER_POOL_ID,
            Limit: 60,
            PaginationToken: token
        }));
        for (const u of r.Users || []) yield u;
        token = r.PaginationToken;
    } while (token);
}

(async () => {
    console.log(`Backfill: setting custom:tenantId=${TARGET_TENANT_ID} on Cognito users...`);
    console.log(`Pool: ${USER_POOL_ID}  DRY_RUN=${DRY_RUN}`);

    let scanned = 0;
    let skipped = 0;
    let updated = 0;
    let failed = 0;

    for await (const user of allUsers()) {
        scanned++;
        const attrs = Object.fromEntries(
            (user.Attributes || []).map(a => [a.Name, a.Value])
        );
        const current = attrs['custom:tenantId'] || '';

        if (current && current !== 'UNASSIGNED') {
            skipped++;
            continue;
        }

        if (DRY_RUN) {
            updated++;
            continue;
        }

        try {
            await cognito.send(new AdminUpdateUserAttributesCommand({
                UserPoolId: USER_POOL_ID,
                Username: user.Username,
                UserAttributes: [{ Name: 'custom:tenantId', Value: TARGET_TENANT_ID }]
            }));
            updated++;
            console.log(`  set ${user.Username} → ${TARGET_TENANT_ID}`);
        } catch (e) {
            failed++;
            console.warn(`  FAILED ${user.Username}: ${e.message}`);
        }
    }

    console.log('—'.repeat(50));
    console.log(`Scanned: ${scanned}`);
    console.log(`Skipped (already set): ${skipped}`);
    console.log(`Updated: ${updated}${DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log(`Failed:  ${failed}`);
})().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});
