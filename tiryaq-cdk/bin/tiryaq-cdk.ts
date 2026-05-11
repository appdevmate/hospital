#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { TiryaqStack } from '../lib/tiryaq-cdk-stack';
// import { TiryaqEdgeStack } from '../lib/tiryaq-edge-stack';

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
// in tiryaq-cdk-stack.ts, and re-deploy with `cdk deploy --all`.
// ─────────────────────────────────────────────────────────────────────
// const edgeStack = new TiryaqEdgeStack(app, 'TiryaqEdgeStack', {
//     env: { account, region: 'us-east-1' },
//     crossRegionReferences: true,
//     description: 'Tiryaq CloudFront WAFv2 — must reside in us-east-1.'
// });

new TiryaqStack(app, 'TiryaqCdkStack', {
    env: { account, region },
    description: 'Tiryaq Hospital Platform.'
    // crossRegionReferences: true,
    // webAclArn: edgeStack.webAclArn
});
