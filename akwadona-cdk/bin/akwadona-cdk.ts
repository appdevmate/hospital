#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AkwadonaStack } from '../lib/akwadona-cdk-stack';
// import { AkwadonaEdgeStack } from '../lib/akwadona-edge-stack';

// ─────────────────────────────────────────────────────────────────────
// Compliance: PDPPL / MOPH data residency.
// Production target is me-south-1 (Bahrain). Currently defaulted to
// us-east-1 because the dev network cannot reach Bahrain endpoints.
// ─────────────────────────────────────────────────────────────────────
const app = new cdk.App();

const account = process.env.CDK_DEPLOY_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEPLOY_REGION ?? 'us-east-1';

if (!account) {
    throw new Error('CDK_DEPLOY_ACCOUNT or CDK_DEFAULT_ACCOUNT must be set before synth/deploy.');
}

// ─────────────────────────────────────────────────────────────────────
// Edge stack (WAF) is temporarily disabled to stop charges.
// To re-enable: uncomment the import + the block below, set webAclId
// in akwadona-cdk-stack.ts, and re-deploy with `cdk deploy --all`.
// ─────────────────────────────────────────────────────────────────────
// const edgeStack = new AkwadonaEdgeStack(app, 'AkwadonaEdgeStack', {
//     env: { account, region: 'us-east-1' },
//     crossRegionReferences: true,
//     description: 'Akwadona CloudFront WAFv2 — must reside in us-east-1.'
// });

new AkwadonaStack(app, 'AkwadonaCdkStack', {
    env: { account, region },
    description: 'Akwadona Hospital Platform.'
    // crossRegionReferences: true,
    // webAclArn: edgeStack.webAclArn
});
