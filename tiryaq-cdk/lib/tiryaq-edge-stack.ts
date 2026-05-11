import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

// ─────────────────────────────────────────────────────────────────────
// Compliance: NCSA NIA + PDPPL Art. 9 (integrity).
// CloudFront-scoped WAFv2 must be created in us-east-1 (AWS limitation).
// This stack owns ONLY the edge WAF; the main stack imports the WebACL
// ARN via crossRegionReferences and attaches it to the distribution.
// ─────────────────────────────────────────────────────────────────────
export class TiryaqEdgeStack extends cdk.Stack {
    public readonly webAclArn: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const webAcl = new wafv2.CfnWebACL(this, 'TiryaqEdgeWebACL', {
            name: 'tiryaq-edge-acl',
            description: 'Tiryaq CloudFront WAF - managed rules and rate limit per source IP.',
            scope: 'CLOUDFRONT',
            defaultAction: { allow: {} },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'tiryaq-edge-acl',
                sampledRequestsEnabled: true
            },
            rules: [
                {
                    name: 'AWS-AWSManagedRulesCommonRuleSet',
                    priority: 0,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet'
                        }
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'common-rules',
                        sampledRequestsEnabled: true
                    }
                },
                {
                    name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 1,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesKnownBadInputsRuleSet'
                        }
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'known-bad-inputs',
                        sampledRequestsEnabled: true
                    }
                },
                {
                    name: 'AWS-AWSManagedRulesSQLiRuleSet',
                    priority: 2,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesSQLiRuleSet'
                        }
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'sqli',
                        sampledRequestsEnabled: true
                    }
                },
                {
                    name: 'RateLimitPerIP',
                    priority: 10,
                    action: { block: {} },
                    statement: {
                        rateBasedStatement: {
                            limit: 2000, // 2,000 req / 5 min per source IP
                            aggregateKeyType: 'IP'
                        }
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'rate-limit',
                        sampledRequestsEnabled: true
                    }
                }
            ]
        });

        this.webAclArn = webAcl.attrArn;

        new cdk.CfnOutput(this, 'WebAclArn', {
            value: webAcl.attrArn,
            description: 'CloudFront WAFv2 ARN — consumed by main stack via crossRegionReferences'
        });
    }
}
