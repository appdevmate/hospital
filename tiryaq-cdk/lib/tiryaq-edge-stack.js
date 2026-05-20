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
exports.TiryaqEdgeStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
// ─────────────────────────────────────────────────────────────────────
// Compliance: NCSA NIA + PDPPL Art. 9 (integrity).
// CloudFront-scoped WAFv2 must be created in us-east-1 (AWS limitation).
// This stack owns ONLY the edge WAF; the main stack imports the WebACL
// ARN via crossRegionReferences and attaches it to the distribution.
// ─────────────────────────────────────────────────────────────────────
class TiryaqEdgeStack extends cdk.Stack {
    webAclArn;
    constructor(scope, id, props) {
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
exports.TiryaqEdgeStack = TiryaqEdgeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWVkZ2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aXJ5YXEtZWRnZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsNkRBQStDO0FBRy9DLHdFQUF3RTtBQUN4RSxtREFBbUQ7QUFDbkQseUVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSxxRUFBcUU7QUFDckUsd0VBQXdFO0FBQ3hFLE1BQWEsZUFBZ0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMxQixTQUFTLENBQVM7SUFFbEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3pELElBQUksRUFBRSxpQkFBaUI7WUFDdkIsV0FBVyxFQUFFLHFFQUFxRTtZQUNsRixLQUFLLEVBQUUsWUFBWTtZQUNuQixhQUFhLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzVCLGdCQUFnQixFQUFFO2dCQUNkLHdCQUF3QixFQUFFLElBQUk7Z0JBQzlCLFVBQVUsRUFBRSxpQkFBaUI7Z0JBQzdCLHNCQUFzQixFQUFFLElBQUk7YUFDL0I7WUFDRCxLQUFLLEVBQUU7Z0JBQ0g7b0JBQ0ksSUFBSSxFQUFFLGtDQUFrQztvQkFDeEMsUUFBUSxFQUFFLENBQUM7b0JBQ1gsY0FBYyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtvQkFDNUIsU0FBUyxFQUFFO3dCQUNQLHlCQUF5QixFQUFFOzRCQUN2QixVQUFVLEVBQUUsS0FBSzs0QkFDakIsSUFBSSxFQUFFLDhCQUE4Qjt5QkFDdkM7cUJBQ0o7b0JBQ0QsZ0JBQWdCLEVBQUU7d0JBQ2Qsd0JBQXdCLEVBQUUsSUFBSTt3QkFDOUIsVUFBVSxFQUFFLGNBQWM7d0JBQzFCLHNCQUFzQixFQUFFLElBQUk7cUJBQy9CO2lCQUNKO2dCQUNEO29CQUNJLElBQUksRUFBRSwwQ0FBMEM7b0JBQ2hELFFBQVEsRUFBRSxDQUFDO29CQUNYLGNBQWMsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7b0JBQzVCLFNBQVMsRUFBRTt3QkFDUCx5QkFBeUIsRUFBRTs0QkFDdkIsVUFBVSxFQUFFLEtBQUs7NEJBQ2pCLElBQUksRUFBRSxzQ0FBc0M7eUJBQy9DO3FCQUNKO29CQUNELGdCQUFnQixFQUFFO3dCQUNkLHdCQUF3QixFQUFFLElBQUk7d0JBQzlCLFVBQVUsRUFBRSxrQkFBa0I7d0JBQzlCLHNCQUFzQixFQUFFLElBQUk7cUJBQy9CO2lCQUNKO2dCQUNEO29CQUNJLElBQUksRUFBRSxnQ0FBZ0M7b0JBQ3RDLFFBQVEsRUFBRSxDQUFDO29CQUNYLGNBQWMsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7b0JBQzVCLFNBQVMsRUFBRTt3QkFDUCx5QkFBeUIsRUFBRTs0QkFDdkIsVUFBVSxFQUFFLEtBQUs7NEJBQ2pCLElBQUksRUFBRSw0QkFBNEI7eUJBQ3JDO3FCQUNKO29CQUNELGdCQUFnQixFQUFFO3dCQUNkLHdCQUF3QixFQUFFLElBQUk7d0JBQzlCLFVBQVUsRUFBRSxNQUFNO3dCQUNsQixzQkFBc0IsRUFBRSxJQUFJO3FCQUMvQjtpQkFDSjtnQkFDRDtvQkFDSSxJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixRQUFRLEVBQUUsRUFBRTtvQkFDWixNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO29CQUNyQixTQUFTLEVBQUU7d0JBQ1Asa0JBQWtCLEVBQUU7NEJBQ2hCLEtBQUssRUFBRSxJQUFJLEVBQUUsa0NBQWtDOzRCQUMvQyxnQkFBZ0IsRUFBRSxJQUFJO3lCQUN6QjtxQkFDSjtvQkFDRCxnQkFBZ0IsRUFBRTt3QkFDZCx3QkFBd0IsRUFBRSxJQUFJO3dCQUM5QixVQUFVLEVBQUUsWUFBWTt3QkFDeEIsc0JBQXNCLEVBQUUsSUFBSTtxQkFDL0I7aUJBQ0o7YUFDSjtTQUNKLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUVoQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNqQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDckIsV0FBVyxFQUFFLHlFQUF5RTtTQUN6RixDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUEzRkQsMENBMkZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHdhZnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy13YWZ2Mic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4vLyBDb21wbGlhbmNlOiBOQ1NBIE5JQSArIFBEUFBMIEFydC4gOSAoaW50ZWdyaXR5KS5cbi8vIENsb3VkRnJvbnQtc2NvcGVkIFdBRnYyIG11c3QgYmUgY3JlYXRlZCBpbiB1cy1lYXN0LTEgKEFXUyBsaW1pdGF0aW9uKS5cbi8vIFRoaXMgc3RhY2sgb3ducyBPTkxZIHRoZSBlZGdlIFdBRjsgdGhlIG1haW4gc3RhY2sgaW1wb3J0cyB0aGUgV2ViQUNMXG4vLyBBUk4gdmlhIGNyb3NzUmVnaW9uUmVmZXJlbmNlcyBhbmQgYXR0YWNoZXMgaXQgdG8gdGhlIGRpc3RyaWJ1dGlvbi5cbi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuZXhwb3J0IGNsYXNzIFRpcnlhcUVkZ2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gICAgcHVibGljIHJlYWRvbmx5IHdlYkFjbEFybjogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgICAgICBjb25zdCB3ZWJBY2wgPSBuZXcgd2FmdjIuQ2ZuV2ViQUNMKHRoaXMsICdUaXJ5YXFFZGdlV2ViQUNMJywge1xuICAgICAgICAgICAgbmFtZTogJ3RpcnlhcS1lZGdlLWFjbCcsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RpcnlhcSBDbG91ZEZyb250IFdBRiAtIG1hbmFnZWQgcnVsZXMgYW5kIHJhdGUgbGltaXQgcGVyIHNvdXJjZSBJUC4nLFxuICAgICAgICAgICAgc2NvcGU6ICdDTE9VREZST05UJyxcbiAgICAgICAgICAgIGRlZmF1bHRBY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICd0aXJ5YXEtZWRnZS1hY2wnLFxuICAgICAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ0FXUy1BV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDAsXG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlQWN0aW9uOiB7IG5vbmU6IHt9IH0sXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnY29tbW9uLXJ1bGVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnQVdTLUFXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzS25vd25CYWRJbnB1dHNSdWxlU2V0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAna25vd24tYmFkLWlucHV0cycsXG4gICAgICAgICAgICAgICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ0FXUy1BV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCcsXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAyLFxuICAgICAgICAgICAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzU1FMaVJ1bGVTZXQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdzcWxpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnUmF0ZUxpbWl0UGVySVAnLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogMTAsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogeyBibG9jazoge30gfSxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYXRlQmFzZWRTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDogMjAwMCwgLy8gMiwwMDAgcmVxIC8gNSBtaW4gcGVyIHNvdXJjZSBJUFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ3JhdGUtbGltaXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLndlYkFjbEFybiA9IHdlYkFjbC5hdHRyQXJuO1xuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJBY2xBcm4nLCB7XG4gICAgICAgICAgICB2YWx1ZTogd2ViQWNsLmF0dHJBcm4sXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgV0FGdjIgQVJOIOKAlCBjb25zdW1lZCBieSBtYWluIHN0YWNrIHZpYSBjcm9zc1JlZ2lvblJlZmVyZW5jZXMnXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==