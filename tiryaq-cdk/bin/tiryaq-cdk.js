#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib/core"));
const tiryaq_cdk_stack_1 = require("../lib/tiryaq-cdk-stack");
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
new tiryaq_cdk_stack_1.TiryaqStack(app, 'TiryaqCdkStack', {
    env: { account, region },
    description: 'Tiryaq Hospital Platform.'
    // crossRegionReferences: true,
    // webAclArn: edgeStack.webAclArn
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWNkay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpcnlhcS1jZGsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esc0RBQXdDO0FBQ3hDLDhEQUFzRDtBQUN0RCw4REFBOEQ7QUFFOUQsd0VBQXdFO0FBQ3hFLDJDQUEyQztBQUMzQyxvRUFBb0U7QUFDcEUsb0VBQW9FO0FBQ3BFLHdFQUF3RTtBQUN4RSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7QUFDbEYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxXQUFXLENBQUM7QUFFNUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyw0RUFBNEUsQ0FBQyxDQUFDO0FBQ2xHLENBQUM7QUFFRCx3RUFBd0U7QUFDeEUsNERBQTREO0FBQzVELHFFQUFxRTtBQUNyRSxpRUFBaUU7QUFDakUsd0VBQXdFO0FBQ3hFLGtFQUFrRTtBQUNsRSw2Q0FBNkM7QUFDN0MsbUNBQW1DO0FBQ25DLHlFQUF5RTtBQUN6RSxNQUFNO0FBRU4sSUFBSSw4QkFBVyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRTtJQUNuQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO0lBQ3hCLFdBQVcsRUFBRSwyQkFBMkI7SUFDeEMsK0JBQStCO0lBQy9CLGlDQUFpQztDQUNwQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWIvY29yZSc7XG5pbXBvcnQgeyBUaXJ5YXFTdGFjayB9IGZyb20gJy4uL2xpYi90aXJ5YXEtY2RrLXN0YWNrJztcbi8vIGltcG9ydCB7IFRpcnlhcUVkZ2VTdGFjayB9IGZyb20gJy4uL2xpYi90aXJ5YXEtZWRnZS1zdGFjayc7XG5cbi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8gQ29tcGxpYW5jZTogUERQUEwgLyBNT1BIIGRhdGEgcmVzaWRlbmN5LlxuLy8gUHJvZHVjdGlvbiB0YXJnZXQgaXMgbWUtc291dGgtMSAoQmFocmFpbikuIEN1cnJlbnRseSBkZWZhdWx0ZWQgdG9cbi8vIHVzLWVhc3QtMSBiZWNhdXNlIHRoZSBkZXYgbmV0d29yayBjYW5ub3QgcmVhY2ggQmFocmFpbiBlbmRwb2ludHMuXG4vLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbmNvbnN0IGFjY291bnQgPSBwcm9jZXNzLmVudi5DREtfREVQTE9ZX0FDQ09VTlQgPz8gcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVDtcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkNES19ERVBMT1lfUkVHSU9OID8/ICd1cy1lYXN0LTEnO1xuXG5pZiAoIWFjY291bnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NES19ERVBMT1lfQUNDT1VOVCBvciBDREtfREVGQVVMVF9BQ0NPVU5UIG11c3QgYmUgc2V0IGJlZm9yZSBzeW50aC9kZXBsb3kuJyk7XG59XG5cbi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8gRWRnZSBzdGFjayAoV0FGKSBpcyB0ZW1wb3JhcmlseSBkaXNhYmxlZCB0byBzdG9wIGNoYXJnZXMuXG4vLyBUbyByZS1lbmFibGU6IHVuY29tbWVudCB0aGUgaW1wb3J0ICsgdGhlIGJsb2NrIGJlbG93LCBzZXQgd2ViQWNsSWRcbi8vIGluIHRpcnlhcS1jZGstc3RhY2sudHMsIGFuZCByZS1kZXBsb3kgd2l0aCBgY2RrIGRlcGxveSAtLWFsbGAuXG4vLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbi8vIGNvbnN0IGVkZ2VTdGFjayA9IG5ldyBUaXJ5YXFFZGdlU3RhY2soYXBwLCAnVGlyeWFxRWRnZVN0YWNrJywge1xuLy8gICAgIGVudjogeyBhY2NvdW50LCByZWdpb246ICd1cy1lYXN0LTEnIH0sXG4vLyAgICAgY3Jvc3NSZWdpb25SZWZlcmVuY2VzOiB0cnVlLFxuLy8gICAgIGRlc2NyaXB0aW9uOiAnVGlyeWFxIENsb3VkRnJvbnQgV0FGdjIg4oCUIG11c3QgcmVzaWRlIGluIHVzLWVhc3QtMS4nXG4vLyB9KTtcblxubmV3IFRpcnlhcVN0YWNrKGFwcCwgJ1RpcnlhcUNka1N0YWNrJywge1xuICAgIGVudjogeyBhY2NvdW50LCByZWdpb24gfSxcbiAgICBkZXNjcmlwdGlvbjogJ1RpcnlhcSBIb3NwaXRhbCBQbGF0Zm9ybS4nXG4gICAgLy8gY3Jvc3NSZWdpb25SZWZlcmVuY2VzOiB0cnVlLFxuICAgIC8vIHdlYkFjbEFybjogZWRnZVN0YWNrLndlYkFjbEFyblxufSk7XG4iXX0=