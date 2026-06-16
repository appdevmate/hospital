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
exports.TiryaqStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigwv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const cloudfrontOrigins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cloudtrail = __importStar(require("aws-cdk-lib/aws-cloudtrail"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_authorizers_1 = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const DEPARTMENTS = [
    'Emergency Medicine',
    'Internal Medicine',
    'General Surgery',
    'Pediatrics',
    'Obstetrics & Gynecology',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Radiology',
    'Pathology',
    'Anesthesiology',
    'Psychiatry',
    'Dermatology',
    'Ophthalmology',
    'Ear Nose & Throat (ENT)',
    'Urology',
    'Oncology',
    'Nephrology',
    'Pulmonology',
    'Gastroenterology',
    'Endocrinology',
    'Rheumatology',
    'Infectious Disease',
    'Hematology',
    'Physical Medicine & Rehabilitation',
    'Pharmacy',
    'Nursing',
    'Administration'
];
const SPECIALIZATIONS = [
    'General (Adult) Internal Medicine',
    'Cardiology',
    'Gastroenterology',
    'Endocrinology & Diabetes',
    'Nephrology',
    'Pulmonology & Respiratory Medicine',
    'Rheumatology',
    'Hematology',
    'Infectious Disease',
    'Geriatric Medicine',
    'General Surgery',
    'Cardiothoracic Surgery',
    'Neurosurgery',
    'Orthopedic Surgery',
    'Plastic & Reconstructive Surgery',
    'Vascular Surgery',
    'Pediatric Surgery',
    'Urological Surgery',
    'Emergency Medicine',
    'Critical Care Medicine',
    'Trauma Surgery',
    'General Pediatrics',
    'Neonatology',
    'Pediatric Cardiology',
    'Pediatric Neurology',
    'Pediatric Oncology',
    'Obstetrics & Gynecology',
    'Maternal-Fetal Medicine',
    'Gynecologic Oncology',
    'Neurology',
    'Psychiatry',
    'Clinical Neurophysiology',
    'Radiology & Medical Imaging',
    'Nuclear Medicine',
    'Pathology & Laboratory Medicine',
    'Ophthalmology',
    'Otolaryngology (ENT)',
    'Dermatology',
    'Sports Medicine',
    'Medical Oncology',
    'Radiation Oncology',
    'Anesthesiology',
    'Pain Medicine',
    'Palliative Care',
    'Family Medicine',
    'Occupational Medicine',
    'Public Health'
];
class TiryaqStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const accountId = cdk.Stack.of(this).account;
        const region = cdk.Stack.of(this).region;
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL Art. 9 — encryption at rest with customer control.
        // Two CMKs:
        //   - tiryaqDataKey  → encrypts DynamoDB and the frontend S3 bucket
        //   - tiryaqAuditKey → encrypts the audit log bucket (separated so
        //                       data-plane key compromise does not invalidate
        //                       the audit chain)
        // Annual automatic rotation; key admins limited to the deploying
        // principal; usage limited to specific AWS services in this account.
        // ─────────────────────────────────────────────────────────────────────
        const tiryaqDataKey = new kms.Key(this, 'TiryaqDataKey', {
            alias: 'alias/tiryaq/data',
            description: 'CMK for Tiryaq DynamoDB and frontend bucket — PDPPL Art. 9.',
            enableKeyRotation: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            pendingWindow: cdk.Duration.days(30)
        });
        const tiryaqAuditKey = new kms.Key(this, 'TiryaqAuditKey', {
            alias: 'alias/tiryaq/audit',
            description: 'CMK for Tiryaq audit log bucket and CloudTrail — segregated from data key.',
            enableKeyRotation: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            pendingWindow: cdk.Duration.days(30)
        });
        // CloudTrail (the AWS service) needs permission to use the audit CMK
        // when it writes encrypted log files into the audit bucket.
        tiryaqAuditKey.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'AllowCloudTrailEncryptLogs',
            actions: ['kms:GenerateDataKey*', 'kms:DescribeKey'],
            principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
            resources: ['*'],
            conditions: {
                StringEquals: { 'aws:SourceAccount': cdk.Aws.ACCOUNT_ID }
            }
        }));
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: separate "service access logs" bucket.
        // S3 server access logging and CloudFront standard logging both
        // refuse SSE-KMS destination buckets, so we keep these AWS-service
        // logs in a dedicated bucket with SSE-S3 + versioning + lifecycle.
        // The high-assurance (CMK + Object Lock) bucket below holds
        // CloudTrail and exported application audit only.
        // ─────────────────────────────────────────────────────────────────────
        const accessLogsBucket = new s3.Bucket(this, 'TiryaqAccessLogsBucket', {
            bucketName: `tiryaq-access-logs-${accountId}-${region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [
                {
                    id: 'transition-and-expire',
                    enabled: true,
                    transitions: [
                        { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(30) },
                        { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(90) }
                    ],
                    expiration: cdk.Duration.days(2555) // 7 years
                }
            ]
        });
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL Art. 9 + MOPH audit trail.
        // Immutable audit log bucket — Object Lock in compliance mode prevents
        // tampering or deletion of audit records, even by account admins.
        // 7-year retention aligns with Qatar healthcare record-keeping norms.
        // Versioning is mandatory for Object Lock.
        // ─────────────────────────────────────────────────────────────────────
        const auditBucket = new s3.Bucket(this, 'TiryaqAuditBucket', {
            bucketName: `tiryaq-audit-${accountId}-${region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: tiryaqAuditKey,
            bucketKeyEnabled: true,
            enforceSSL: true,
            versioned: true,
            objectLockEnabled: true,
            objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(2555)), // 7 years
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [
                {
                    id: 'transition-to-glacier',
                    enabled: true,
                    transitions: [
                        { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(90) }
                    ],
                    noncurrentVersionTransitions: [
                        { storageClass: s3.StorageClass.DEEP_ARCHIVE, transitionAfter: cdk.Duration.days(180) }
                    ]
                }
            ]
        });
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL + NCSA NIA — infrastructure-level audit.
        // Multi-region trail with log file validation. Captures every AWS API
        // call (control plane). Sent to the immutable audit bucket above.
        // S3 data events captured for the frontend bucket so we can prove
        // who downloaded what (PHI access path through pre-signed URLs).
        // ─────────────────────────────────────────────────────────────────────
        const trail = new cloudtrail.Trail(this, 'TiryaqCloudTrail', {
            trailName: 'tiryaq-cloudtrail',
            bucket: auditBucket,
            s3KeyPrefix: 'cloudtrail',
            isMultiRegionTrail: true,
            includeGlobalServiceEvents: true,
            enableFileValidation: true,
            sendToCloudWatchLogs: true,
            cloudWatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_YEAR,
            encryptionKey: tiryaqAuditKey
        });
        // ─────────────────────────────────────────────────────────────────────
        // DynamoDB
        //
        // IMPORTANT — GSI DEPLOYMENT RULE:
        // DynamoDB only allows ONE GSI to be created per table update.
        // This means on a FRESH deploy (new account), all 7 GSIs will be
        // created successfully because CDK creates the table + all GSIs
        // in the initial CREATE operation (not an UPDATE).
        //
        // However if you add a NEW GSI to an existing table via cdk deploy,
        // you MUST add only one at a time — otherwise CloudFormation will
        // fail with "Cannot perform more than one GSI creation or deletion
        // in a single update".
        //
        // Current GSIs (all created on fresh deploy):
        //   1. EntityType-index          — main query index
        //   2. PatientID-index           — patient-related queries
        //   3. email-index               — lookup by email
        //   4. doctorEmail-createdAt-index — doctor email + date queries
        //   5. GSI1                      — generic GSI (GSI1PK + GSI1SK)
        //   6. GSI2                      — name search (name_prefix + name_lower)
        //   7. dataClass-index           — PDPPL breach scoping (Update 06)
        //
        // Compliance — every item written to this table SHOULD include a
        // `dataClass` attribute drawn from { PHI, PII, PUBLIC, AUDIT, SYSTEM }
        // and an OPTIONAL `expiresAt` (epoch seconds) attribute that DynamoDB
        // TTL will use to auto-purge transient records.
        // ─────────────────────────────────────────────────────────────────────
        const table = new dynamodb.Table(this, 'HospitalTable', {
            tableName: 'Hospital',
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: tiryaqDataKey,
            deletionProtection: true,
            timeToLiveAttribute: 'expiresAt'
        });
        table.addGlobalSecondaryIndex({
            indexName: 'EntityType-index',
            partitionKey: { name: 'EntityType', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        table.addGlobalSecondaryIndex({
            indexName: 'PatientID-index',
            partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        table.addGlobalSecondaryIndex({
            indexName: 'email-index',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'EntityType', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        table.addGlobalSecondaryIndex({
            indexName: 'doctorEmail-createdAt-index',
            partitionKey: { name: 'doctorEmail', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        table.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        table.addGlobalSecondaryIndex({
            indexName: 'GSI2',
            partitionKey: { name: 'name_prefix', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'name_lower', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL breach scoping + NCSA NIA data classification.
        // Lets us answer "show me every PHI record touched between t1 and t2"
        // without a full table scan during a forensic investigation.
        // Sort key = updatedAt so we get items in chronological order.
        // ─────────────────────────────────────────────────────────────────────
        table.addGlobalSecondaryIndex({
            indexName: 'dataClass-index',
            partitionKey: { name: 'dataClass', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.KEYS_ONLY
        });
        // ─────────────────────────────────────────────────────────────────────
        // Step 2 — Multi-tenant foundation.
        // Pooled multi-tenancy (Athenahealth / Particle Health model):
        // every row carries `tenantId`. This GSI lets each customer list
        // their own rows by EntityType in O(1) — no full-table scans, no
        // cross-tenant leak risk. Sort key = EntityType so a tenant can
        // request "all PATIENT rows for tenant T_a1b2c3d4" in one Query.
        // ─────────────────────────────────────────────────────────────────────
        table.addGlobalSecondaryIndex({
            indexName: 'tenant-entityType-index',
            partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'EntityType', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // ─────────────────────────────────────────────────────────────────────
        // Step 4 — Hashed-search lookup index.
        // After Step 3 encrypted `email`, `qid`, `phone`, the existing
        // email-index returns ciphertext that varies per row, so equality
        // lookups by email no longer work. We store an HMAC-SHA256 hash
        // (`emailHash`) alongside the ciphertext and Query this index to
        // find a record by its plaintext email after hashing the input
        // with the tenant's KMS HMAC key.
        // ─────────────────────────────────────────────────────────────────────
        table.addGlobalSecondaryIndex({
            indexName: 'emailHash-EntityType-index',
            partitionKey: { name: 'emailHash', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'EntityType', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // ─────────────────────────────────────────────────────────────────────
        // Cognito User Pool
        // ─────────────────────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL Art. 9 + MOPH access-control expectations.
        // - Password policy aligned with NCSA NIA: 12 chars min, all classes.
        // - Temporary password validity reduced to 3 days (force rotation).
        // - MFA REQUIRED for every user; TOTP preferred, SMS fallback.
        // - Advanced Security audits (Cognito threat protection) enforced.
        // ─────────────────────────────────────────────────────────────────────
        const userPool = new cognito.UserPool(this, 'TiryaqUserPool', {
            userPoolName: 'tiryaq-user-pool',
            selfSignUpEnabled: false,
            signInAliases: { username: true, email: true },
            autoVerify: { email: true },
            standardAttributes: {
                email: { required: true, mutable: true },
                fullname: { required: true, mutable: true },
                gender: { required: true, mutable: true },
                phoneNumber: { required: false, mutable: true },
                birthdate: { required: false, mutable: true }
            },
            // ─────────────────────────────────────────────────────────────
            // Step 2 — Multi-tenant foundation.
            // `custom:tenantId` is the opaque ID (e.g. T_a1b2c3d4) that
            // ties a user to one hospital customer. Injected into the JWT
            // by the pre-token-generation Lambda and read by every backend
            // Lambda to scope DynamoDB queries. Mutable=true so the
            // operator console can re-assign a user (rare, but possible
            // for cross-hospital transfers).
            // ─────────────────────────────────────────────────────────────
            customAttributes: {
                tenantId: new cognito.StringAttribute({ mutable: true, minLen: 1, maxLen: 64 })
            },
            passwordPolicy: {
                minLength: 12,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: cdk.Duration.days(3)
            },
            // Compliance regression: MFA fully disabled (REQUIRED -> OPTIONAL
            // -> OFF) by request. The two-step path was needed because
            // Cognito refuses REQUIRED -> OFF directly on a live pool.
            // Re-enable by restoring Mfa.REQUIRED and re-deploying.
            mfa: cognito.Mfa.OFF,
            // mfaSecondFactor not needed when mfa is OFF.
            // mfaSecondFactor: { sms: true, otp: true },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            standardThreatProtectionMode: cognito.StandardThreatProtectionMode.FULL_FUNCTION,
            deviceTracking: {
                challengeRequiredOnNewDevice: true,
                deviceOnlyRememberedOnUserPrompt: true
            },
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });
        const appClient = userPool.addClient('TiryaqAppClient', {
            userPoolClientName: 'Tiryaq',
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
                custom: true
            },
            oAuth: {
                flows: { authorizationCodeGrant: true },
                scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PHONE, cognito.OAuthScope.PROFILE],
                callbackUrls: ['http://localhost:4200/', 'https://d6i7iwknkj0bg.cloudfront.net/'],
                logoutUrls: ['http://localhost:4200/', 'https://d6i7iwknkj0bg.cloudfront.net/']
            },
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),
            preventUserExistenceErrors: true
        });
        userPool.addDomain('TiryaqDomain', {
            cognitoDomain: { domainPrefix: 'tiryaq-hospital' }
        });
        // Step 7 — Add `Operator` group for Akwadona platform staff. Members
        // of this group access the operator console at www.akwadona.com,
        // bypass tenantId checks, but have NO kms:Decrypt on any tenant key
        // (enforced by the key-policy condition that matches only Lambda
        // execution roles, not human-derived JWT claims).
        ['Admin', 'Developers', 'Doctors', 'Pharmacists', 'Operator'].forEach((groupName) => {
            new cognito.CfnUserPoolGroup(this, `Group${groupName}`, {
                userPoolId: userPool.userPoolId,
                groupName,
                description: `${groupName} group`
            });
        });
        // ─────────────────────────────────────────────────────────────────────
        // Pre Token Generation Lambda
        // Injects email + name from Cognito user attributes into the
        // Access Token claims so all Lambda functions can identify the actor.
        // ─────────────────────────────────────────────────────────────────────
        const preTokenFn = new lambda.Function(this, 'CognitoPreTokenGeneration', {
            functionName: 'cognito-pre-token-generation',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/cognito-pre-token-generation'),
            timeout: cdk.Duration.seconds(10)
        });
        preTokenFn.addPermission('CognitoInvoke', {
            principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
            sourceArn: userPool.userPoolArn
        });
        const cfnUserPool = userPool.node.defaultChild;
        cfnUserPool.lambdaConfig = {
            preTokenGenerationConfig: {
                lambdaArn: preTokenFn.functionArn,
                lambdaVersion: 'V3_0'
            }
        };
        // ─────────────────────────────────────────────────────────────────────
        // Step 3 — Per-tenant KMS keys for PHI envelope encryption.
        //
        // Keys are created OUTSIDE CDK (via AWS Console / CLI) so they survive
        // stack rebuilds and don't count against the 500-resource ceiling.
        // The key policies whitelist any role matching
        // `TiryaqCdkStack-*ServiceRole*` — that's every Lambda execution role
        // in this stack, automatically. No IAM grant from CDK is needed.
        //
        // To onboard a new tenant: create a CMK in us-east-1 with alias
        // `akwadona-tenant-<slug>`, apply the standard key policy template,
        // then add its tenantId → ARN entry below and redeploy.
        // ─────────────────────────────────────────────────────────────────────
        const tenantKeys = {
            'T_2572fc71': 'arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6', // Tiryaq
            'T_a4b8aef9': 'arn:aws:kms:us-east-1:483176634665:key/c1c1657b-b3f9-41a9-a816-dee382e00bb1' // Alshifaa
        };
        // ─────────────────────────────────────────────────────────────────────
        // Step 4 — Per-tenant KMS HMAC keys for searchable hashed fields.
        //
        // PHI fields like `qid`, `email`, `phone` are now encrypted (Step 3),
        // so equality lookups (find patient by QID) no longer work — every
        // encryption uses a fresh IV, so the same plaintext produces different
        // ciphertext each time. To restore search we store an HMAC-SHA256
        // hash alongside the ciphertext: deterministic per (tenant, plaintext),
        // one-way (can't reverse), tenant-scoped (different tenants produce
        // different hashes for the same input).
        //
        // KMS HMAC keys keep the secret inside the FIPS 140-2 HSM — the
        // hashing call goes to KMS, the Lambda never sees the secret.
        // ─────────────────────────────────────────────────────────────────────
        const tenantHmacKeys = {
            'T_2572fc71': 'arn:aws:kms:us-east-1:483176634665:key/601f8aab-f37c-4786-a557-afc12cb864e8', // Tiryaq HMAC
            'T_a4b8aef9': 'arn:aws:kms:us-east-1:483176634665:key/0a23ea33-4659-4f37-a4a2-a62366010bcd' // Alshifaa HMAC
        };
        // ─────────────────────────────────────────────────────────────────────
        // Shared Lambda environment + helper
        // ─────────────────────────────────────────────────────────────────────
        const sharedEnv = {
            TABLE_NAME: 'Hospital',
            USER_POOL_ID: userPool.userPoolId,
            // JSON map: tenantId → KMS key ARN. The crypto helper in each
            // Lambda parses this once and uses it to encrypt/decrypt PHI.
            TENANT_KEYS: JSON.stringify(tenantKeys),
            // Step 4 — JSON map: tenantId → KMS HMAC key ARN. Used by the
            // crypto helper's computeHmac() to produce searchable hashes of
            // PHI fields. Never sees the key material — KMS runs the MAC.
            TENANT_HMAC_KEYS: JSON.stringify(tenantHmacKeys)
        };
        // Lambda factory.
        // Memory bumped to 512 MB by default — Node.js cold-start scales with
        // CPU which is allocated proportionally to memory; 512 MB roughly
        // halves cold-start time vs the default 128 MB and is still pennies/month.
        const fn = (id, folder, handler, runtime = lambda.Runtime.NODEJS_18_X, extraEnv = {}, opts = {}) => new lambda.Function(this, id, {
            functionName: folder,
            runtime,
            handler,
            code: lambda.Code.fromAsset(`lambda/${folder}`),
            environment: { ...sharedEnv, ...extraEnv },
            timeout: cdk.Duration.seconds(30),
            memorySize: opts.memorySize ?? 512
        });
        // ─────────────────────────────────────────────────────────────────────
        // Lambda functions
        // ─────────────────────────────────────────────────────────────────────
        const getAllPatientsFn = fn('GetAllPatients', 'getAllPatients', 'index.handler');
        const getPatientByIDFn = fn('GetPatientByID', 'getPatientByID', 'index.handler');
        const createPatientFn = fn('CreatePatient', 'createPatient', 'index.handler');
        const updatePatientFn = fn('UpdatePatient', 'updatePatient', 'index.handler');
        const deletePatientFn = fn('DeletePatient', 'deletePatient', 'index.handler');
        const getPatientsDataByFiltersFn = fn('GetPatientsDataByFilters', 'getPatientsDataByFilters', 'index.handler');
        const getAllDoctorsFn = fn('GetAllDoctors', 'getAllDoctors', 'index.handler');
        const getDoctorByIDFn = fn('GetDoctorByID', 'getDoctorByID', 'index.handler');
        const getDoctorByEmailFn = fn('GetDoctorByEmail', 'getDoctorByEmail', 'index.handler', lambda.Runtime.NODEJS_24_X);
        const createDoctorFn = fn('CreateDoctor', 'createDoctor', 'index.handler');
        const updateDoctorFn = fn('UpdateDoctor', 'updateDoctor', 'index.handler');
        const deleteDoctorFn = fn('DeleteDoctor', 'deleteDoctor', 'index.handler');
        const createPatientPaymentFn = fn('CreatePatientPayment', 'createPatientPayment', 'index.handler');
        const getAllPaymentsForPatientFn = fn('GetAllPaymentsForPatient', 'getAllPaymentsForPatient', 'index.handler');
        const listAllPaymentsForPatientByIDFn = fn('ListAllPaymentsForPatientByID', 'listAllPaymentsForPatientByID', 'index.handler');
        const updatePatientPaymentFn = fn('UpdatePatientPayment', 'updatePatientPayment', 'index.handler');
        const getPaymentByIDFn = fn('GetPaymentByID', 'getPaymentByID', 'index.handler');
        const deletePaymentFn = fn('DeletePayment', 'deletePayment', 'index.handler');
        const getAllInvoicesFn = fn('GetAllInvoices', 'getAllInvoices', 'index.handler', lambda.Runtime.NODEJS_24_X);
        // createPatientSurgeryFn removed (was an unimplemented stub) to free
        // CFN resources for the operator console. Re-add when the surgery
        // module is built out.
        const listAllSurgeriesForPatientByIDFn = fn('ListAllSurgeriesForPatientByID', 'listAllSurgeriesForPatientByID', 'index.handler');
        const getSurgeryByIDFn = fn('GetSurgeryByID', 'getSurgeryByID', 'index.handler');
        const getAllDepartmentsFn = fn('GetAllDepartments', 'getAllDepartments', 'index.handler');
        const createNewDepartmentFn = fn('CreateNewDepartment', 'createNewDepartment', 'index.handler');
        const bulkCreateDepartmentsFn = fn('BulkCreateDepartments', 'bulkCreateDepartments', 'index.handler');
        const deleteAllDepartmentsFn = fn('DeleteAllDepartments', 'deleteAllDepartments', 'index.handler');
        const getAllSpecializationsFn = fn('GetAllSpecializations', 'getAllSpecializations', 'index.handler');
        const createNewSpecializationFn = fn('CreateNewSpecialization', 'createNewSpecialization', 'index.handler');
        const bulkCreateSpecializationsFn = fn('BulkCreateSpecializations', 'bulkCreateSpecializations', 'index.handler');
        const deleteAllSpecializationsFn = fn('DeleteAllSpecializations', 'deleteAllSpecializations', 'index.handler');
        const adminPanelFn = fn('TiryaqAdminPanel', 'tiryaq-admin-panel', 'index.handler', lambda.Runtime.NODEJS_20_X);
        // Step 7 — Operator console backend.
        // Read-mostly Lambda that surfaces tenant metadata, counts, and
        // audit metadata to the operator UI at www.akwadona.com. By
        // convention it never calls KMS Decrypt on tenant data — see the
        // top-of-file comment in tiryaq-operator-console/index.js.
        const operatorConsoleFn = fn('TiryaqOperatorConsole', 'tiryaq-operator-console', 'index.handler', lambda.Runtime.NODEJS_20_X);
        const examinationsFn = fn('TiryaqExaminations', 'tiryaq-examinations', 'index.handler', lambda.Runtime.NODEJS_24_X);
        const pharmacyFn = fn('TiryaqPharmacy', 'tiryaq-pharmacy', 'index.handler', lambda.Runtime.NODEJS_24_X);
        const documentManagerFn = fn('TiryaqDocumentManager', 'tiryaq-document-manager', 'index.handler', lambda.Runtime.NODEJS_24_X);
        const auditFn = fn('TiryaqAudit', 'tiryaq-audit', 'index.handler', lambda.Runtime.NODEJS_24_X);
        const appointmentsFn = fn('TiryaqAppointments', 'tiryaq-appointments', 'index.handler', lambda.Runtime.NODEJS_24_X);
        // Hospital calendar — replaces the previous external CalendarPlatform SaaS.
        // All calendar data now persists in the Hospital DynamoDB table for
        // PDPPL data-residency + clinical-privacy compliance.
        const calendarFn = fn('TiryaqCalendar', 'tiryaq-calendar', 'index.handler', lambda.Runtime.NODEJS_20_X);
        // Blood Bank module — donors / donations / inventory / requests / crossmatch / issue.
        const bloodbankFn = fn('TiryaqBloodbank', 'tiryaq-bloodbank', 'index.handler', lambda.Runtime.NODEJS_20_X);
        // ─────────────────────────────────────────────────────────────────────
        // ScribeFirst Phase 1 — SOAP generation Lambda.
        // Calls Bedrock for transcript → SOAP split; writes session + audit
        // rows to the existing single-table.
        // BEDROCK_REGION can differ from AWS_REGION when Bedrock isn't yet
        // available in the data-plane region (e.g. me-south-1 production).
        // ─────────────────────────────────────────────────────────────────────
        const scribeFn = fn('TiryaqScribe', 'tiryaq-scribe', 'index.handler', lambda.Runtime.NODEJS_20_X, {
            BEDROCK_REGION: 'us-east-1',
            // Claude 3.5 Haiku via the US cross-region inference profile.
            // The original claude-3-haiku-20240307 model was retired/marked
            // legacy by the provider, which caused InvokeModel AccessDenied.
            // Newer Anthropic models on Bedrock are only invokable through an
            // inference profile (the "us." prefix), not the bare model ID.
            BEDROCK_MODEL_ID: 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
        });
        // Allow Bedrock InvokeModel on the Claude 3.5 Haiku US inference profile.
        // A cross-region inference profile requires permission on BOTH the
        // profile ARN and the underlying foundation-model ARNs in every region
        // the profile can route to (us-east-1 / us-east-2 / us-west-2).
        scribeFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: [
                `arn:aws:bedrock:us-east-1:${this.account}:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0`,
                'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
                'arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
                'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0'
            ]
        }));
        // ─────────────────────────────────────────────────────────────────────
        // DynamoDB permissions
        // ─────────────────────────────────────────────────────────────────────
        const allFunctions = [
            getAllPatientsFn,
            getPatientByIDFn,
            createPatientFn,
            updatePatientFn,
            deletePatientFn,
            getPatientsDataByFiltersFn,
            getAllDoctorsFn,
            getDoctorByIDFn,
            getDoctorByEmailFn,
            createDoctorFn,
            updateDoctorFn,
            deleteDoctorFn,
            createPatientPaymentFn,
            getAllPaymentsForPatientFn,
            listAllPaymentsForPatientByIDFn,
            updatePatientPaymentFn,
            getPaymentByIDFn,
            deletePaymentFn,
            getAllInvoicesFn,
            listAllSurgeriesForPatientByIDFn,
            getSurgeryByIDFn,
            getAllDepartmentsFn,
            createNewDepartmentFn,
            bulkCreateDepartmentsFn,
            deleteAllDepartmentsFn,
            getAllSpecializationsFn,
            createNewSpecializationFn,
            bulkCreateSpecializationsFn,
            deleteAllSpecializationsFn,
            adminPanelFn,
            operatorConsoleFn,
            examinationsFn,
            pharmacyFn,
            documentManagerFn,
            auditFn,
            appointmentsFn,
            calendarFn,
            bloodbankFn,
            scribeFn
        ];
        allFunctions.forEach((f) => {
            table.grantReadWriteData(f);
            // Compliance: Lambda execution roles must be explicitly granted
            // KMS Encrypt/Decrypt on the data CMK because DynamoDB CUSTOMER_MANAGED
            // encryption requires the caller principal to have key access.
            tiryaqDataKey.grantEncryptDecrypt(f);
        });
        // Step 7 cleanup — EventBridge warmer removed to free CFN resources
        // for the operator console. At our traffic levels Lambda containers
        // stay warm naturally, and the warmer's 6 resources (1 rule + 5
        // Lambda permissions) were eating into our 500-resource budget.
        // The Lambdas still short-circuit on `_warmup` events so any future
        // re-introduction (or external pinger) works without code change.
        // Seed Lambda also writes to the encrypted table.
        // (granted further down where seedFn is defined.)
        adminPanelFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['cognito-idp:ListUsers', 'cognito-idp:ListUsersInGroup', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminEnableUser', 'cognito-idp:AdminSetUserPassword'],
            resources: [userPool.userPoolArn]
        }));
        // Documents bucket access is granted on the bucket construct below
        // (see TiryaqDocumentsBucket), so no cross-account inline policy here.
        // ─────────────────────────────────────────────────────────────────────
        // Seed Lambda — departments, specializations, counters
        // ─────────────────────────────────────────────────────────────────────
        const seedFn = new lambda.Function(this, 'TiryaqSeedFunction', {
            functionName: 'tiryaq-seed',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(5),
            environment: { TABLE_NAME: 'Hospital' },
            code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE  = process.env.TABLE_NAME;
const DEPARTMENTS = ${JSON.stringify(DEPARTMENTS)};
const SPECIALIZATIONS = ${JSON.stringify(SPECIALIZATIONS)};

// attribute_not_exists(PK) makes every Put idempotent — existing rows are
// preserved. This protects the patient/doctor counters from being reset on
// any future replay of this CustomResource.
async function putIfAbsent(item) {
    try {
        await client.send(new PutCommand({
            TableName: TABLE,
            Item: item,
            ConditionExpression: 'attribute_not_exists(PK)'
        }));
        return true;
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return false;
        throw e;
    }
}

exports.handler = async (event) => {
    // RequestType handling:
    //   Create → run the full seed.
    //   Update → NO-OP. Reference data (departments, specializations) and
    //            live counters must not be regenerated automatically. To
    //            re-seed intentionally, replace this CustomResource via
    //            console or bump the logical id.
    //   Delete → NO-OP. Never destroy seeded reference data on stack delete.
    if (event.RequestType !== 'Create') {
        return { PhysicalResourceId: 'seed', Data: { skipped: event.RequestType } };
    }
    const now = new Date().toISOString();
    let written = 0;
    if (await putIfAbsent({ PK: 'COUNTER#PATIENTS', SK: 'COUNTER', count: 0, EntityType: 'COUNTER' })) written++;
    if (await putIfAbsent({ PK: 'COUNTER#DOCTORS',  SK: 'COUNTER', count: 0, EntityType: 'COUNTER' })) written++;
    for (const name of DEPARTMENTS) {
        const id = randomUUID();
        if (await putIfAbsent({ PK: \`DEPARTMENT#\${id}\`, SK: 'PROFILE', EntityType: 'DEPARTMENT', departmentId: id, name, createdAt: now })) written++;
    }
    for (const name of SPECIALIZATIONS) {
        const id = randomUUID();
        if (await putIfAbsent({ PK: \`SPECIALIZATION#\${id}\`, SK: 'PROFILE', EntityType: 'SPECIALIZATION', specializationId: id, name, createdAt: now })) written++;
    }
    return { PhysicalResourceId: 'seed', Data: { written } };
};
            `)
        });
        table.grantWriteData(seedFn);
        tiryaqDataKey.grantEncryptDecrypt(seedFn);
        const seedProvider = new cr.Provider(this, 'SeedProvider', { onEventHandler: seedFn });
        // Stable property — same on every synth — so CloudFormation does NOT
        // re-trigger an Update of the SeedData CustomResource on `cdk deploy`.
        // Previously `timestamp: Date.now()` caused the seed Lambda to run on
        // every deploy, resetting patient/doctor counters and duplicating
        // department/specialization records.
        new cdk.CustomResource(this, 'SeedData', {
            serviceToken: seedProvider.serviceToken,
            properties: { seedVersion: 1 }
        });
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL Art. 9 — no shared / hardcoded credentials.
        // Each seeded user gets a CRYPTOGRAPHICALLY RANDOM temporary password
        // that satisfies the strengthened password policy. The password is:
        //   - issued as TEMPORARY (Permanent=false) so Cognito forces a
        //     password change at first login,
        //   - stored in AWS Secrets Manager under
        //     /tiryaq/seed-users/<username>, encrypted with the data CMK,
        //   - never logged, never returned to the API caller.
        // ─────────────────────────────────────────────────────────────────────
        const usersFn = new lambda.Function(this, 'TiryaqUsersFunction', {
            functionName: 'tiryaq-create-users',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(5),
            environment: {
                USER_POOL_ID: userPool.userPoolId,
                DATA_KMS_KEY_ID: tiryaqDataKey.keyId
            },
            code: lambda.Code.fromInline(`
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('crypto');

const cognito = new CognitoIdentityProviderClient({});
const secrets = new SecretsManagerClient({});
const POOL = process.env.USER_POOL_ID;
const KEY  = process.env.DATA_KMS_KEY_ID;

const SEED_USERS = [
    { username: 'admin1',      name: 'Admin One',      email: 'admin1@tiryaq.com',      group: 'Admin' },
    { username: 'admin2',      name: 'Admin Two',      email: 'admin2@tiryaq.com',      group: 'Admin' },
    { username: 'developer1',  name: 'Developer One',  email: 'dev1@tiryaq.com',        group: 'Developers' },
    { username: 'developer2',  name: 'Developer Two',  email: 'dev2@tiryaq.com',        group: 'Developers' },
    { username: 'doctor1',     name: 'Doctor One',     email: 'doctor1@tiryaq.com',     group: 'Doctors' },
    { username: 'doctor2',     name: 'Doctor Two',     email: 'doctor2@tiryaq.com',     group: 'Doctors' },
    { username: 'pharmacist1', name: 'Pharmacist One', email: 'pharmacist1@tiryaq.com', group: 'Pharmacists' },
    { username: 'pharmacist2', name: 'Pharmacist Two', email: 'pharmacist2@tiryaq.com', group: 'Pharmacists' }
];

// Generates a 20-char password that always satisfies the policy:
// upper, lower, digit, symbol, length >= 12.
function generateTempPassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digit = '23456789';
    const symbol = '!@#$%^&*()-_=+';
    const all = upper + lower + digit + symbol;
    const pick = (set) => set[crypto.randomInt(0, set.length)];
    let pwd = pick(upper) + pick(lower) + pick(digit) + pick(symbol);
    while (pwd.length < 20) pwd += pick(all);
    return pwd.split('').sort(() => crypto.randomInt(0, 2) - 1).join('');
}

async function storeSecret(username, password) {
    const name = '/tiryaq/seed-users/' + username;
    try {
        await secrets.send(new CreateSecretCommand({
            Name: name,
            Description: 'Temporary password for seeded Tiryaq user — must be changed on first login.',
            SecretString: JSON.stringify({ username, temporaryPassword: password, mustChange: true }),
            KmsKeyId: KEY
        }));
    } catch (e) {
        if (e.name === 'ResourceExistsException') {
            await secrets.send(new PutSecretValueCommand({
                SecretId: name,
                SecretString: JSON.stringify({ username, temporaryPassword: password, mustChange: true })
            }));
        } else {
            throw e;
        }
    }
}

exports.handler = async (event) => {
    if (event.RequestType === 'Delete') return { PhysicalResourceId: 'users' };
    for (const user of SEED_USERS) {
        const tempPassword = generateTempPassword();
        try {
            // Permanent=false (default) → Cognito flags FORCE_CHANGE_PASSWORD.
            await cognito.send(new AdminCreateUserCommand({
                UserPoolId: POOL,
                Username: user.username,
                MessageAction: 'SUPPRESS',
                TemporaryPassword: tempPassword,
                UserAttributes: [
                    { Name: 'email',          Value: user.email },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'name',           Value: user.name },
                    { Name: 'gender',         Value: 'Male' }
                ]
            }));
            await cognito.send(new AdminAddUserToGroupCommand({
                UserPoolId: POOL, Username: user.username, GroupName: user.group
            }));
            await storeSecret(user.username, tempPassword);
        } catch (e) {
            if (e.name === 'UsernameExistsException') {
                // User already exists — do not reset their password silently.
                continue;
            }
            throw e;
        }
    }
    return { PhysicalResourceId: 'users' };
};
            `)
        });
        usersFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminAddUserToGroup'
            ],
            resources: [userPool.userPoolArn]
        }));
        usersFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'secretsmanager:CreateSecret',
                'secretsmanager:PutSecretValue',
                'secretsmanager:DescribeSecret'
            ],
            resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:/tiryaq/seed-users/*`]
        }));
        // Lambda must be allowed to use the data CMK to encrypt the secret.
        tiryaqDataKey.grantEncryptDecrypt(usersFn);
        const usersProvider = new cr.Provider(this, 'UsersProvider', { onEventHandler: usersFn });
        new cdk.CustomResource(this, 'CreateUsers', {
            serviceToken: usersProvider.serviceToken,
            properties: { userPoolId: userPool.userPoolId }
        });
        // ─────────────────────────────────────────────────────────────────────
        // API Gateway + JWT Authorizer
        // ─────────────────────────────────────────────────────────────────────
        const authorizer = new aws_apigatewayv2_authorizers_1.HttpJwtAuthorizer('TiryaqAuthorizer', `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`, {
            jwtAudience: [appClient.userPoolClientId],
            identitySource: ['$request.header.Authorization']
        });
        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL Art. 9 (integrity & confidentiality).
        // CORS is restricted to the production CloudFront domain plus localhost
        // for dev. Wildcard origins are forbidden — they enable cross-site data
        // exfiltration from the patient's browser.
        // ─────────────────────────────────────────────────────────────────────
        // Step 2 / Step 3 fix — every tenant subdomain must be on this list,
        // otherwise the browser rejects API calls from tiryaq.akwadona.com,
        // alshifaa.akwadona.com, etc. Add the new slug here whenever a
        // tenant is onboarded (same list lives in src/app/services/tenant.service.ts).
        const tenantSlugs = ['tiryaq', 'alshifaa'];
        const tenantOrigins = tenantSlugs.map(slug => `https://${slug}.akwadona.com`);
        const allowedOrigins = [
            'http://localhost:4200',
            'https://d6i7iwknkj0bg.cloudfront.net',
            'https://akwadona.com',
            'https://www.akwadona.com',
            ...tenantOrigins
        ];
        const api = new apigwv2.HttpApi(this, 'TiryaqHttpApi', {
            apiName: 'tiryaq-api',
            corsPreflight: {
                allowOrigins: allowedOrigins,
                allowMethods: [
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.PATCH,
                    apigwv2.CorsHttpMethod.DELETE,
                    apigwv2.CorsHttpMethod.OPTIONS
                ],
                allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Request-Id'],
                allowCredentials: false,
                maxAge: cdk.Duration.minutes(10)
            }
        });
        const route = (path, methods, handler) => api.addRoutes({
            path,
            methods,
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration(path.replace(/[^a-zA-Z0-9]/g, '') + methods.join(''), handler),
            authorizer
        });
        route('/patients', [apigwv2.HttpMethod.GET], getAllPatientsFn);
        route('/patients', [apigwv2.HttpMethod.POST], createPatientFn);
        route('/patients/{patientID}', [apigwv2.HttpMethod.GET], getPatientByIDFn);
        route('/patients/{patientID}', [apigwv2.HttpMethod.PATCH], updatePatientFn);
        route('/patients/{patientID}', [apigwv2.HttpMethod.DELETE], deletePatientFn);
        route('/patients/{patientID}/restore', [apigwv2.HttpMethod.PATCH], updatePatientFn);
        route('/patients/search', [apigwv2.HttpMethod.GET], getPatientsDataByFiltersFn);
        route('/doctors', [apigwv2.HttpMethod.GET], getAllDoctorsFn);
        route('/doctors', [apigwv2.HttpMethod.POST], createDoctorFn);
        route('/doctors/{doctorID}', [apigwv2.HttpMethod.GET], getDoctorByIDFn);
        route('/doctors/{doctorID}', [apigwv2.HttpMethod.PATCH], updateDoctorFn);
        route('/doctors/{doctorID}', [apigwv2.HttpMethod.DELETE], deleteDoctorFn);
        route('/doctors/email/{email}', [apigwv2.HttpMethod.GET], getDoctorByEmailFn);
        route('/patients/{patientID}/payments', [apigwv2.HttpMethod.GET], getAllPaymentsForPatientFn);
        route('/patients/{patientID}/payments', [apigwv2.HttpMethod.POST], createPatientPaymentFn);
        route('/patients/{patientID}/payments/{paymentID}', [apigwv2.HttpMethod.GET], getPaymentByIDFn);
        route('/patients/{patientID}/payments/{paymentID}', [apigwv2.HttpMethod.PATCH], updatePatientPaymentFn);
        route('/patients/{patientID}/payments/{paymentID}', [apigwv2.HttpMethod.DELETE], deletePaymentFn);
        route('/payments', [apigwv2.HttpMethod.GET], listAllPaymentsForPatientByIDFn);
        route('/invoices', [apigwv2.HttpMethod.GET], getAllInvoicesFn);
        route('/patients/{patientID}/surgeries', [apigwv2.HttpMethod.GET], listAllSurgeriesForPatientByIDFn);
        // /patients/{patientID}/surgeries POST removed with createPatientSurgeryFn stub.
        route('/surgeries/{surgeryID}', [apigwv2.HttpMethod.GET], getSurgeryByIDFn);
        route('/departments', [apigwv2.HttpMethod.GET], getAllDepartmentsFn);
        route('/departments', [apigwv2.HttpMethod.POST], createNewDepartmentFn);
        route('/departments/bulk', [apigwv2.HttpMethod.POST], bulkCreateDepartmentsFn);
        route('/departments', [apigwv2.HttpMethod.DELETE], deleteAllDepartmentsFn);
        route('/specializations', [apigwv2.HttpMethod.GET], getAllSpecializationsFn);
        route('/specializations', [apigwv2.HttpMethod.POST], createNewSpecializationFn);
        route('/specializations/bulk', [apigwv2.HttpMethod.POST], bulkCreateSpecializationsFn);
        route('/specializations', [apigwv2.HttpMethod.DELETE], deleteAllSpecializationsFn);
        route('/admin/stats', [apigwv2.HttpMethod.GET], adminPanelFn);
        route('/admin/users', [apigwv2.HttpMethod.GET], adminPanelFn);
        route('/admin/users/{username}/disable', [apigwv2.HttpMethod.POST], adminPanelFn);
        route('/admin/users/{username}/enable', [apigwv2.HttpMethod.POST], adminPanelFn);
        route('/admin/users/{username}/set-password', [apigwv2.HttpMethod.POST], adminPanelFn);
        route('/admin/audit', [apigwv2.HttpMethod.GET], adminPanelFn);
        // Step 7 — Operator console: single catch-all route. We deliberately
        // use {proxy+} + ANY method to keep the resource count low (each
        // path × method = a CFN route resource; we were near the 500
        // ceiling). The Lambda parses the path itself. All requests still
        // pass through the JWT authorizer; the Lambda then checks
        // claims.role === 'operator'.
        api.addRoutes({
            path: '/operator/{proxy+}',
            methods: [apigwv2.HttpMethod.ANY],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('OperatorConsoleProxy', operatorConsoleFn),
            authorizer
        });
        route('/examinations', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], examinationsFn);
        route('/examinations/{examId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], examinationsFn);
        route('/examinations/{examId}/signoff', [apigwv2.HttpMethod.POST], examinationsFn);
        // Pharmacy routes — paths match the tiryaq-pharmacy Lambda's internal router.
        // (Lambda dispatches on event.rawPath; CDK must register identical paths.)
        route('/pharmacy/medications', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], pharmacyFn);
        route('/pharmacy/medications/{medId}', [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], pharmacyFn);
        route('/pharmacy/inventory', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], pharmacyFn);
        route('/pharmacy/inventory/{medId}', [apigwv2.HttpMethod.PATCH], pharmacyFn);
        route('/pharmacy/prescriptions', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], pharmacyFn);
        route('/pharmacy/prescriptions/{rxId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH], pharmacyFn);
        route('/pharmacy/dispense', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], pharmacyFn);
        route('/pharmacy/purchase-orders', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], pharmacyFn);
        route('/pharmacy/purchase-orders/{poId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH], pharmacyFn);
        route('/pharmacy/alerts', [apigwv2.HttpMethod.GET], pharmacyFn);
        // Document manager — paths match the tiryaq-document-manager Lambda's
        // internal router and the Angular DocumentService calls.
        route('/documents/upload-url', [apigwv2.HttpMethod.POST], documentManagerFn);
        route('/documents/download-url', [apigwv2.HttpMethod.POST], documentManagerFn);
        route('/documents/list', [apigwv2.HttpMethod.GET], documentManagerFn);
        route('/documents/folders', [apigwv2.HttpMethod.GET], documentManagerFn);
        route('/documents/delete', [apigwv2.HttpMethod.DELETE], documentManagerFn);
        route('/audit', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], auditFn);
        route('/appointments', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], appointmentsFn);
        route('/appointments/{apptId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], appointmentsFn);
        // Hospital calendar routes — Tiryaq-local, JWT-authenticated.
        route('/calendars', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], calendarFn);
        route('/calendars/{calendarId}', [apigwv2.HttpMethod.DELETE], calendarFn);
        route('/calendars/{calendarId}/events', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], calendarFn);
        route('/calendars/{calendarId}/events/{eventId}', [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], calendarFn);
        // Blood Bank module
        route('/bloodbank/donors', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], bloodbankFn);
        route('/bloodbank/donors/{donorId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], bloodbankFn);
        route('/bloodbank/donors/{donorId}/donations', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], bloodbankFn);
        route('/bloodbank/donations', [apigwv2.HttpMethod.GET], bloodbankFn);
        route('/bloodbank/units', [apigwv2.HttpMethod.GET], bloodbankFn);
        route('/bloodbank/units/{unitId}', [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], bloodbankFn);
        route('/bloodbank/stock', [apigwv2.HttpMethod.GET], bloodbankFn);
        route('/bloodbank/requests', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], bloodbankFn);
        route('/bloodbank/requests/{requestId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], bloodbankFn);
        route('/bloodbank/requests/{requestId}/crossmatch', [apigwv2.HttpMethod.POST], bloodbankFn);
        route('/bloodbank/requests/{requestId}/issue', [apigwv2.HttpMethod.POST], bloodbankFn);
        // ScribeFirst Phase 1 — SOAP scribe routes
        route('/scribe/sessions', [apigwv2.HttpMethod.POST], scribeFn);
        route('/scribe/sessions/{id}', [apigwv2.HttpMethod.GET], scribeFn);
        route('/scribe/sessions/{id}/soap', [apigwv2.HttpMethod.POST], scribeFn);
        route('/scribe/sessions/{id}/approve', [apigwv2.HttpMethod.POST], scribeFn);
        // ─────────────────────────────────────────────────────────────────────
        // S3 + CloudFront
        // ─────────────────────────────────────────────────────────────────────
        const siteBucket = new s3.Bucket(this, 'TiryaqFrontendBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: tiryaqDataKey,
            bucketKeyEnabled: true,
            enforceSSL: true,
            versioned: true,
            serverAccessLogsBucket: accessLogsBucket,
            serverAccessLogsPrefix: 's3-access/frontend/',
            lifecycleRules: [
                {
                    id: 'expire-noncurrent-versions',
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(180)
                }
            ]
        });
        const oac = new cloudfront.S3OriginAccessControl(this, 'TiryaqOAC', {
            signing: cloudfront.Signing.SIGV4_NO_OVERRIDE
        });
        const distribution = new cloudfront.Distribution(this, 'TiryaqDistribution', {
            defaultBehavior: {
                origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(siteBucket, {
                    originAccessControl: oac
                }),
                viewerProtocolPolicy: aws_cloudfront_1.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: aws_cloudfront_1.CachePolicy.CACHING_OPTIMIZED,
                allowedMethods: aws_cloudfront_1.AllowedMethods.ALLOW_GET_HEAD,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS
            },
            defaultRootObject: 'index.html',
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            // Compliance regression: WAF temporarily disabled to stop charges.
            // Re-enable by setting webAclId back to props?.webAclArn and
            // re-instating the TiryaqEdgeStack in bin/tiryaq-cdk.ts.
            // webAclId: props?.webAclArn,
            // Compliance: PDPPL audit trail — log every CloudFront request
            // (viewer IP, request URI, response status). Sent to the
            // service-logs bucket because CloudFront cannot deliver to an
            // SSE-KMS destination.
            enableLogging: true,
            logBucket: accessLogsBucket,
            logFilePrefix: 'cloudfront/',
            errorResponses: [
                { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
                { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' }
            ],
            comment: 'Tiryaq Hospital Platform'
        });
        siteBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${siteBucket.bucketArn}/*`],
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
            conditions: {
                StringEquals: {
                    'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${distribution.distributionId}`
                }
            }
        }));
        // ─────────────────────────────────────────────────────────────────────
        // Documents bucket (owned by THIS account)
        // The old `tiryaq-documents` name belongs to a different account, which
        // is why CORS could never be set. We create our own account-scoped
        // bucket and declare CORS as a property so browser→S3 pre-signed PUT/GET
        // uploads are allowed. The Lambda reads the name from DOCUMENTS_BUCKET.
        // ─────────────────────────────────────────────────────────────────────
        const documentsBucket = new s3.Bucket(this, 'TiryaqDocumentsBucket', {
            bucketName: `tiryaq-documents-${accountId}-${region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedHeaders: ['*'],
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
                    allowedOrigins,
                    exposedHeaders: ['ETag', 'Content-Length', 'Content-Type'],
                    maxAge: 3600
                }
            ]
        });
        documentsBucket.grantReadWrite(documentManagerFn);
        documentManagerFn.addEnvironment('DOCUMENTS_BUCKET', documentsBucket.bucketName);
        // ─────────────────────────────────────────────────────────────────────
        // Outputs
        // ─────────────────────────────────────────────────────────────────────
        new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint, description: 'HTTP API URL → update Config.ts tiryaqUrl' });
        new cdk.CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.distributionDomainName}`, description: 'Frontend URL → update callbackUrls + logoutUrls then redeploy' });
        new cdk.CfnOutput(this, 'S3BucketName', { value: siteBucket.bucketName, description: 'S3 bucket → ng build + aws s3 sync' });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId, description: 'Cognito User Pool ID → update app.config.ts authority' });
        new cdk.CfnOutput(this, 'AppClientId', { value: appClient.userPoolClientId, description: 'Cognito App Client ID → update app.config.ts clientId' });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId, description: 'CloudFront Distribution ID → cache invalidation' });
        new cdk.CfnOutput(this, 'CognitoAuthority', { value: `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`, description: 'Cognito authority URL → update app.config.ts' });
        new cdk.CfnOutput(this, 'DocumentsBucketName', { value: documentsBucket.bucketName, description: 'Documents bucket (uploads via pre-signed URLs)' });
    }
}
exports.TiryaqStack = TiryaqStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWNkay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpcnlhcS1jZGstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELHNFQUF3RDtBQUN4RCx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFRbkQsK0RBQStGO0FBQy9GLDZGQUFrRjtBQUNsRiwyRkFBNkU7QUFHN0UsTUFBTSxXQUFXLEdBQUc7SUFDaEIsb0JBQW9CO0lBQ3BCLG1CQUFtQjtJQUNuQixpQkFBaUI7SUFDakIsWUFBWTtJQUNaLHlCQUF5QjtJQUN6QixZQUFZO0lBQ1osV0FBVztJQUNYLGFBQWE7SUFDYixXQUFXO0lBQ1gsV0FBVztJQUNYLGdCQUFnQjtJQUNoQixZQUFZO0lBQ1osYUFBYTtJQUNiLGVBQWU7SUFDZix5QkFBeUI7SUFDekIsU0FBUztJQUNULFVBQVU7SUFDVixZQUFZO0lBQ1osYUFBYTtJQUNiLGtCQUFrQjtJQUNsQixlQUFlO0lBQ2YsY0FBYztJQUNkLG9CQUFvQjtJQUNwQixZQUFZO0lBQ1osb0NBQW9DO0lBQ3BDLFVBQVU7SUFDVixTQUFTO0lBQ1QsZ0JBQWdCO0NBQ25CLENBQUM7QUFFRixNQUFNLGVBQWUsR0FBRztJQUNwQixtQ0FBbUM7SUFDbkMsWUFBWTtJQUNaLGtCQUFrQjtJQUNsQiwwQkFBMEI7SUFDMUIsWUFBWTtJQUNaLG9DQUFvQztJQUNwQyxjQUFjO0lBQ2QsWUFBWTtJQUNaLG9CQUFvQjtJQUNwQixvQkFBb0I7SUFDcEIsaUJBQWlCO0lBQ2pCLHdCQUF3QjtJQUN4QixjQUFjO0lBQ2Qsb0JBQW9CO0lBQ3BCLGtDQUFrQztJQUNsQyxrQkFBa0I7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YUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsdURBQXVELEVBQUUsQ0FBQyxDQUFDO1FBQ3BKLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLGNBQWMsRUFBRSxXQUFXLEVBQUUsaURBQWlELEVBQUUsQ0FBQyxDQUFDO1FBQ2xKLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLE1BQU0sa0JBQWtCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsOENBQThDLEVBQUUsQ0FBQyxDQUFDO1FBQzFMLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsZ0RBQWdELEVBQUUsQ0FBQyxDQUFDO0lBQ3pKLENBQUM7Q0FDSjtBQTdqQ0Qsa0NBNmpDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250T3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkdHJhaWwgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkdHJhaWwnO1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyBldmVudHNUYXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRpcnlhcVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgICAvKiogQVJOIG9mIHRoZSBDbG91ZEZyb250LXNjb3BlZCBXQUZ2MiBXZWJBQ0wgY3JlYXRlZCBpbiB0aGUgZWRnZSAodXMtZWFzdC0xKSBzdGFjay4gKi9cclxuICAgIHdlYkFjbEFybj86IHN0cmluZztcclxufVxyXG5pbXBvcnQgeyBWaWV3ZXJQcm90b2NvbFBvbGljeSwgQWxsb3dlZE1ldGhvZHMsIENhY2hlUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IEh0dHBKd3RBdXRob3JpemVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuY29uc3QgREVQQVJUTUVOVFMgPSBbXHJcbiAgICAnRW1lcmdlbmN5IE1lZGljaW5lJyxcclxuICAgICdJbnRlcm5hbCBNZWRpY2luZScsXHJcbiAgICAnR2VuZXJhbCBTdXJnZXJ5JyxcclxuICAgICdQZWRpYXRyaWNzJyxcclxuICAgICdPYnN0ZXRyaWNzICYgR3luZWNvbG9neScsXHJcbiAgICAnQ2FyZGlvbG9neScsXHJcbiAgICAnTmV1cm9sb2d5JyxcclxuICAgICdPcnRob3BlZGljcycsXHJcbiAgICAnUmFkaW9sb2d5JyxcclxuICAgICdQYXRob2xvZ3knLFxyXG4gICAgJ0FuZXN0aGVzaW9sb2d5JyxcclxuICAgICdQc3ljaGlhdHJ5JyxcclxuICAgICdEZXJtYXRvbG9neScsXHJcbiAgICAnT3BodGhhbG1vbG9neScsXHJcbiAgICAnRWFyIE5vc2UgJiBUaHJvYXQgKEVOVCknLFxyXG4gICAgJ1Vyb2xvZ3knLFxyXG4gICAgJ09uY29sb2d5JyxcclxuICAgICdOZXBocm9sb2d5JyxcclxuICAgICdQdWxtb25vbG9neScsXHJcbiAgICAnR2FzdHJvZW50ZXJvbG9neScsXHJcbiAgICAnRW5kb2NyaW5vbG9neScsXHJcbiAgICAnUmhldW1hdG9sb2d5JyxcclxuICAgICdJbmZlY3Rpb3VzIERpc2Vhc2UnLFxyXG4gICAgJ0hlbWF0b2xvZ3knLFxyXG4gICAgJ1BoeXNpY2FsIE1lZGljaW5lICYgUmVoYWJpbGl0YXRpb24nLFxyXG4gICAgJ1BoYXJtYWN5JyxcclxuICAgICdOdXJzaW5nJyxcclxuICAgICdBZG1pbmlzdHJhdGlvbidcclxuXTtcclxuXHJcbmNvbnN0IFNQRUNJQUxJWkFUSU9OUyA9IFtcclxuICAgICdHZW5lcmFsIChBZHVsdCkgSW50ZXJuYWwgTWVkaWNpbmUnLFxyXG4gICAgJ0NhcmRpb2xvZ3knLFxyXG4gICAgJ0dhc3Ryb2VudGVyb2xvZ3knLFxyXG4gICAgJ0VuZG9jcmlub2xvZ3kgJiBEaWFiZXRlcycsXHJcbiAgICAnTmVwaHJvbG9neScsXHJcbiAgICAnUHVsbW9ub2xvZ3kgJiBSZXNwaXJhdG9yeSBNZWRpY2luZScsXHJcbiAgICAnUmhldW1hdG9sb2d5JyxcclxuICAgICdIZW1hdG9sb2d5JyxcclxuICAgICdJbmZlY3Rpb3VzIERpc2Vhc2UnLFxyXG4gICAgJ0dlcmlhdHJpYyBNZWRpY2luZScsXHJcbiAgICAnR2VuZXJhbCBTdXJnZXJ5JyxcclxuICAgICdDYXJkaW90aG9yYWNpYyBTdXJnZXJ5JyxcclxuICAgICdOZXVyb3N1cmdlcnknLFxyXG4gICAgJ09ydGhvcGVkaWMgU3VyZ2VyeScsXHJcbiAgICAnUGxhc3RpYyAmIFJlY29uc3RydWN0aXZlIFN1cmdlcnknLFxyXG4gICAgJ1Zhc2N1bGFyIFN1cmdlcnknLFxyXG4gICAgJ1BlZGlhdHJpYyBTdXJnZXJ5JyxcclxuICAgICdVcm9sb2dpY2FsIFN1cmdlcnknLFxyXG4gICAgJ0VtZXJnZW5jeSBNZWRpY2luZScsXHJcbiAgICAnQ3JpdGljYWwgQ2FyZSBNZWRpY2luZScsXHJcbiAgICAnVHJhdW1hIFN1cmdlcnknLFxyXG4gICAgJ0dlbmVyYWwgUGVkaWF0cmljcycsXHJcbiAgICAnTmVvbmF0b2xvZ3knLFxyXG4gICAgJ1BlZGlhdHJpYyBDYXJkaW9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgTmV1cm9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgT25jb2xvZ3knLFxyXG4gICAgJ09ic3RldHJpY3MgJiBHeW5lY29sb2d5JyxcclxuICAgICdNYXRlcm5hbC1GZXRhbCBNZWRpY2luZScsXHJcbiAgICAnR3luZWNvbG9naWMgT25jb2xvZ3knLFxyXG4gICAgJ05ldXJvbG9neScsXHJcbiAgICAnUHN5Y2hpYXRyeScsXHJcbiAgICAnQ2xpbmljYWwgTmV1cm9waHlzaW9sb2d5JyxcclxuICAgICdSYWRpb2xvZ3kgJiBNZWRpY2FsIEltYWdpbmcnLFxyXG4gICAgJ051Y2xlYXIgTWVkaWNpbmUnLFxyXG4gICAgJ1BhdGhvbG9neSAmIExhYm9yYXRvcnkgTWVkaWNpbmUnLFxyXG4gICAgJ09waHRoYWxtb2xvZ3knLFxyXG4gICAgJ090b2xhcnluZ29sb2d5IChFTlQpJyxcclxuICAgICdEZXJtYXRvbG9neScsXHJcbiAgICAnU3BvcnRzIE1lZGljaW5lJyxcclxuICAgICdNZWRpY2FsIE9uY29sb2d5JyxcclxuICAgICdSYWRpYXRpb24gT25jb2xvZ3knLFxyXG4gICAgJ0FuZXN0aGVzaW9sb2d5JyxcclxuICAgICdQYWluIE1lZGljaW5lJyxcclxuICAgICdQYWxsaWF0aXZlIENhcmUnLFxyXG4gICAgJ0ZhbWlseSBNZWRpY2luZScsXHJcbiAgICAnT2NjdXBhdGlvbmFsIE1lZGljaW5lJyxcclxuICAgICdQdWJsaWMgSGVhbHRoJ1xyXG5dO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRpcnlhcVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogVGlyeWFxU3RhY2tQcm9wcykge1xyXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgICAgICBjb25zdCBhY2NvdW50SWQgPSBjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudDtcclxuICAgICAgICBjb25zdCByZWdpb24gPSBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkg4oCUIGVuY3J5cHRpb24gYXQgcmVzdCB3aXRoIGN1c3RvbWVyIGNvbnRyb2wuXHJcbiAgICAgICAgLy8gVHdvIENNS3M6XHJcbiAgICAgICAgLy8gICAtIHRpcnlhcURhdGFLZXkgIOKGkiBlbmNyeXB0cyBEeW5hbW9EQiBhbmQgdGhlIGZyb250ZW5kIFMzIGJ1Y2tldFxyXG4gICAgICAgIC8vICAgLSB0aXJ5YXFBdWRpdEtleSDihpIgZW5jcnlwdHMgdGhlIGF1ZGl0IGxvZyBidWNrZXQgKHNlcGFyYXRlZCBzb1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBsYW5lIGtleSBjb21wcm9taXNlIGRvZXMgbm90IGludmFsaWRhdGVcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgdGhlIGF1ZGl0IGNoYWluKVxyXG4gICAgICAgIC8vIEFubnVhbCBhdXRvbWF0aWMgcm90YXRpb247IGtleSBhZG1pbnMgbGltaXRlZCB0byB0aGUgZGVwbG95aW5nXHJcbiAgICAgICAgLy8gcHJpbmNpcGFsOyB1c2FnZSBsaW1pdGVkIHRvIHNwZWNpZmljIEFXUyBzZXJ2aWNlcyBpbiB0aGlzIGFjY291bnQuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdGlyeWFxRGF0YUtleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdUaXJ5YXFEYXRhS2V5Jywge1xyXG4gICAgICAgICAgICBhbGlhczogJ2FsaWFzL3RpcnlhcS9kYXRhJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDTUsgZm9yIFRpcnlhcSBEeW5hbW9EQiBhbmQgZnJvbnRlbmQgYnVja2V0IOKAlCBQRFBQTCBBcnQuIDkuJyxcclxuICAgICAgICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgcGVuZGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHRpcnlhcUF1ZGl0S2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1RpcnlhcUF1ZGl0S2V5Jywge1xyXG4gICAgICAgICAgICBhbGlhczogJ2FsaWFzL3RpcnlhcS9hdWRpdCcsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ01LIGZvciBUaXJ5YXEgYXVkaXQgbG9nIGJ1Y2tldCBhbmQgQ2xvdWRUcmFpbCDigJQgc2VncmVnYXRlZCBmcm9tIGRhdGEga2V5LicsXHJcbiAgICAgICAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBlbmRpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5kYXlzKDMwKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDbG91ZFRyYWlsICh0aGUgQVdTIHNlcnZpY2UpIG5lZWRzIHBlcm1pc3Npb24gdG8gdXNlIHRoZSBhdWRpdCBDTUtcclxuICAgICAgICAvLyB3aGVuIGl0IHdyaXRlcyBlbmNyeXB0ZWQgbG9nIGZpbGVzIGludG8gdGhlIGF1ZGl0IGJ1Y2tldC5cclxuICAgICAgICB0aXJ5YXFBdWRpdEtleS5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBzaWQ6ICdBbGxvd0Nsb3VkVHJhaWxFbmNyeXB0TG9ncycsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2ttczpHZW5lcmF0ZURhdGFLZXkqJywgJ2ttczpEZXNjcmliZUtleSddLFxyXG4gICAgICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWR0cmFpbC5hbWF6b25hd3MuY29tJyldLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHsgJ2F3czpTb3VyY2VBY2NvdW50JzogY2RrLkF3cy5BQ0NPVU5UX0lEIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBzZXBhcmF0ZSBcInNlcnZpY2UgYWNjZXNzIGxvZ3NcIiBidWNrZXQuXHJcbiAgICAgICAgLy8gUzMgc2VydmVyIGFjY2VzcyBsb2dnaW5nIGFuZCBDbG91ZEZyb250IHN0YW5kYXJkIGxvZ2dpbmcgYm90aFxyXG4gICAgICAgIC8vIHJlZnVzZSBTU0UtS01TIGRlc3RpbmF0aW9uIGJ1Y2tldHMsIHNvIHdlIGtlZXAgdGhlc2UgQVdTLXNlcnZpY2VcclxuICAgICAgICAvLyBsb2dzIGluIGEgZGVkaWNhdGVkIGJ1Y2tldCB3aXRoIFNTRS1TMyArIHZlcnNpb25pbmcgKyBsaWZlY3ljbGUuXHJcbiAgICAgICAgLy8gVGhlIGhpZ2gtYXNzdXJhbmNlIChDTUsgKyBPYmplY3QgTG9jaykgYnVja2V0IGJlbG93IGhvbGRzXHJcbiAgICAgICAgLy8gQ2xvdWRUcmFpbCBhbmQgZXhwb3J0ZWQgYXBwbGljYXRpb24gYXVkaXQgb25seS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhY2Nlc3NMb2dzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxQWNjZXNzTG9nc0J1Y2tldCcsIHtcclxuICAgICAgICAgICAgYnVja2V0TmFtZTogYHRpcnlhcS1hY2Nlc3MtbG9ncy0ke2FjY291bnRJZH0tJHtyZWdpb259YCxcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG9iamVjdE93bmVyc2hpcDogczMuT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9QUkVGRVJSRUQsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ3RyYW5zaXRpb24tYW5kLWV4cGlyZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLCB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApIH1cclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDI1NTUpIC8vIDcgeWVhcnNcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkgKyBNT1BIIGF1ZGl0IHRyYWlsLlxyXG4gICAgICAgIC8vIEltbXV0YWJsZSBhdWRpdCBsb2cgYnVja2V0IOKAlCBPYmplY3QgTG9jayBpbiBjb21wbGlhbmNlIG1vZGUgcHJldmVudHNcclxuICAgICAgICAvLyB0YW1wZXJpbmcgb3IgZGVsZXRpb24gb2YgYXVkaXQgcmVjb3JkcywgZXZlbiBieSBhY2NvdW50IGFkbWlucy5cclxuICAgICAgICAvLyA3LXllYXIgcmV0ZW50aW9uIGFsaWducyB3aXRoIFFhdGFyIGhlYWx0aGNhcmUgcmVjb3JkLWtlZXBpbmcgbm9ybXMuXHJcbiAgICAgICAgLy8gVmVyc2lvbmluZyBpcyBtYW5kYXRvcnkgZm9yIE9iamVjdCBMb2NrLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGF1ZGl0QnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxQXVkaXRCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtYXVkaXQtJHthY2NvdW50SWR9LSR7cmVnaW9ufWAsXHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFBdWRpdEtleSxcclxuICAgICAgICAgICAgYnVja2V0S2V5RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICAgICAgICBvYmplY3RMb2NrRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgb2JqZWN0TG9ja0RlZmF1bHRSZXRlbnRpb246IHMzLk9iamVjdExvY2tSZXRlbnRpb24uY29tcGxpYW5jZShjZGsuRHVyYXRpb24uZGF5cygyNTU1KSksIC8vIDcgeWVhcnNcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndHJhbnNpdGlvbi10by1nbGFjaWVyJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUiwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCkgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgbm9uY3VycmVudFZlcnNpb25UcmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkRFRVBfQVJDSElWRSwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygxODApIH1cclxuICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgKyBOQ1NBIE5JQSDigJQgaW5mcmFzdHJ1Y3R1cmUtbGV2ZWwgYXVkaXQuXHJcbiAgICAgICAgLy8gTXVsdGktcmVnaW9uIHRyYWlsIHdpdGggbG9nIGZpbGUgdmFsaWRhdGlvbi4gQ2FwdHVyZXMgZXZlcnkgQVdTIEFQSVxyXG4gICAgICAgIC8vIGNhbGwgKGNvbnRyb2wgcGxhbmUpLiBTZW50IHRvIHRoZSBpbW11dGFibGUgYXVkaXQgYnVja2V0IGFib3ZlLlxyXG4gICAgICAgIC8vIFMzIGRhdGEgZXZlbnRzIGNhcHR1cmVkIGZvciB0aGUgZnJvbnRlbmQgYnVja2V0IHNvIHdlIGNhbiBwcm92ZVxyXG4gICAgICAgIC8vIHdobyBkb3dubG9hZGVkIHdoYXQgKFBISSBhY2Nlc3MgcGF0aCB0aHJvdWdoIHByZS1zaWduZWQgVVJMcykuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdHJhaWwgPSBuZXcgY2xvdWR0cmFpbC5UcmFpbCh0aGlzLCAnVGlyeWFxQ2xvdWRUcmFpbCcsIHtcclxuICAgICAgICAgICAgdHJhaWxOYW1lOiAndGlyeWFxLWNsb3VkdHJhaWwnLFxyXG4gICAgICAgICAgICBidWNrZXQ6IGF1ZGl0QnVja2V0LFxyXG4gICAgICAgICAgICBzM0tleVByZWZpeDogJ2Nsb3VkdHJhaWwnLFxyXG4gICAgICAgICAgICBpc011bHRpUmVnaW9uVHJhaWw6IHRydWUsXHJcbiAgICAgICAgICAgIGluY2x1ZGVHbG9iYWxTZXJ2aWNlRXZlbnRzOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmFibGVGaWxlVmFsaWRhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgc2VuZFRvQ2xvdWRXYXRjaExvZ3M6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hMb2dzUmV0ZW50aW9uOiBjZGsuYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfWUVBUixcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxQXVkaXRLZXlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRHluYW1vREJcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIElNUE9SVEFOVCDigJQgR1NJIERFUExPWU1FTlQgUlVMRTpcclxuICAgICAgICAvLyBEeW5hbW9EQiBvbmx5IGFsbG93cyBPTkUgR1NJIHRvIGJlIGNyZWF0ZWQgcGVyIHRhYmxlIHVwZGF0ZS5cclxuICAgICAgICAvLyBUaGlzIG1lYW5zIG9uIGEgRlJFU0ggZGVwbG95IChuZXcgYWNjb3VudCksIGFsbCA3IEdTSXMgd2lsbCBiZVxyXG4gICAgICAgIC8vIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5IGJlY2F1c2UgQ0RLIGNyZWF0ZXMgdGhlIHRhYmxlICsgYWxsIEdTSXNcclxuICAgICAgICAvLyBpbiB0aGUgaW5pdGlhbCBDUkVBVEUgb3BlcmF0aW9uIChub3QgYW4gVVBEQVRFKS5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIEhvd2V2ZXIgaWYgeW91IGFkZCBhIE5FVyBHU0kgdG8gYW4gZXhpc3RpbmcgdGFibGUgdmlhIGNkayBkZXBsb3ksXHJcbiAgICAgICAgLy8geW91IE1VU1QgYWRkIG9ubHkgb25lIGF0IGEgdGltZSDigJQgb3RoZXJ3aXNlIENsb3VkRm9ybWF0aW9uIHdpbGxcclxuICAgICAgICAvLyBmYWlsIHdpdGggXCJDYW5ub3QgcGVyZm9ybSBtb3JlIHRoYW4gb25lIEdTSSBjcmVhdGlvbiBvciBkZWxldGlvblxyXG4gICAgICAgIC8vIGluIGEgc2luZ2xlIHVwZGF0ZVwiLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gQ3VycmVudCBHU0lzIChhbGwgY3JlYXRlZCBvbiBmcmVzaCBkZXBsb3kpOlxyXG4gICAgICAgIC8vICAgMS4gRW50aXR5VHlwZS1pbmRleCAgICAgICAgICDigJQgbWFpbiBxdWVyeSBpbmRleFxyXG4gICAgICAgIC8vICAgMi4gUGF0aWVudElELWluZGV4ICAgICAgICAgICDigJQgcGF0aWVudC1yZWxhdGVkIHF1ZXJpZXNcclxuICAgICAgICAvLyAgIDMuIGVtYWlsLWluZGV4ICAgICAgICAgICAgICAg4oCUIGxvb2t1cCBieSBlbWFpbFxyXG4gICAgICAgIC8vICAgNC4gZG9jdG9yRW1haWwtY3JlYXRlZEF0LWluZGV4IOKAlCBkb2N0b3IgZW1haWwgKyBkYXRlIHF1ZXJpZXNcclxuICAgICAgICAvLyAgIDUuIEdTSTEgICAgICAgICAgICAgICAgICAgICAg4oCUIGdlbmVyaWMgR1NJIChHU0kxUEsgKyBHU0kxU0spXHJcbiAgICAgICAgLy8gICA2LiBHU0kyICAgICAgICAgICAgICAgICAgICAgIOKAlCBuYW1lIHNlYXJjaCAobmFtZV9wcmVmaXggKyBuYW1lX2xvd2VyKVxyXG4gICAgICAgIC8vICAgNy4gZGF0YUNsYXNzLWluZGV4ICAgICAgICAgICDigJQgUERQUEwgYnJlYWNoIHNjb3BpbmcgKFVwZGF0ZSAwNilcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIENvbXBsaWFuY2Ug4oCUIGV2ZXJ5IGl0ZW0gd3JpdHRlbiB0byB0aGlzIHRhYmxlIFNIT1VMRCBpbmNsdWRlIGFcclxuICAgICAgICAvLyBgZGF0YUNsYXNzYCBhdHRyaWJ1dGUgZHJhd24gZnJvbSB7IFBISSwgUElJLCBQVUJMSUMsIEFVRElULCBTWVNURU0gfVxyXG4gICAgICAgIC8vIGFuZCBhbiBPUFRJT05BTCBgZXhwaXJlc0F0YCAoZXBvY2ggc2Vjb25kcykgYXR0cmlidXRlIHRoYXQgRHluYW1vREJcclxuICAgICAgICAvLyBUVEwgd2lsbCB1c2UgdG8gYXV0by1wdXJnZSB0cmFuc2llbnQgcmVjb3Jkcy5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnSG9zcGl0YWxUYWJsZScsIHtcclxuICAgICAgICAgICAgdGFibGVOYW1lOiAnSG9zcGl0YWwnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7IHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFEYXRhS2V5LFxyXG4gICAgICAgICAgICBkZWxldGlvblByb3RlY3Rpb246IHRydWUsXHJcbiAgICAgICAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICdleHBpcmVzQXQnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnRW50aXR5VHlwZS1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRW50aXR5VHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdQYXRpZW50SUQtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3BhdGllbnRJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ2VtYWlsLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdlbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZG9jdG9yRW1haWwtY3JlYXRlZEF0LWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkb2N0b3JFbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdHU0kxJyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdHU0kxUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdHU0kxU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnR1NJMicsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbmFtZV9wcmVmaXgnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICduYW1lX2xvd2VyJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBicmVhY2ggc2NvcGluZyArIE5DU0EgTklBIGRhdGEgY2xhc3NpZmljYXRpb24uXHJcbiAgICAgICAgLy8gTGV0cyB1cyBhbnN3ZXIgXCJzaG93IG1lIGV2ZXJ5IFBISSByZWNvcmQgdG91Y2hlZCBiZXR3ZWVuIHQxIGFuZCB0MlwiXHJcbiAgICAgICAgLy8gd2l0aG91dCBhIGZ1bGwgdGFibGUgc2NhbiBkdXJpbmcgYSBmb3JlbnNpYyBpbnZlc3RpZ2F0aW9uLlxyXG4gICAgICAgIC8vIFNvcnQga2V5ID0gdXBkYXRlZEF0IHNvIHdlIGdldCBpdGVtcyBpbiBjaHJvbm9sb2dpY2FsIG9yZGVyLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZGF0YUNsYXNzLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkYXRhQ2xhc3MnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1cGRhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuS0VZU19PTkxZXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFN0ZXAgMiDigJQgTXVsdGktdGVuYW50IGZvdW5kYXRpb24uXHJcbiAgICAgICAgLy8gUG9vbGVkIG11bHRpLXRlbmFuY3kgKEF0aGVuYWhlYWx0aCAvIFBhcnRpY2xlIEhlYWx0aCBtb2RlbCk6XHJcbiAgICAgICAgLy8gZXZlcnkgcm93IGNhcnJpZXMgYHRlbmFudElkYC4gVGhpcyBHU0kgbGV0cyBlYWNoIGN1c3RvbWVyIGxpc3RcclxuICAgICAgICAvLyB0aGVpciBvd24gcm93cyBieSBFbnRpdHlUeXBlIGluIE8oMSkg4oCUIG5vIGZ1bGwtdGFibGUgc2NhbnMsIG5vXHJcbiAgICAgICAgLy8gY3Jvc3MtdGVuYW50IGxlYWsgcmlzay4gU29ydCBrZXkgPSBFbnRpdHlUeXBlIHNvIGEgdGVuYW50IGNhblxyXG4gICAgICAgIC8vIHJlcXVlc3QgXCJhbGwgUEFUSUVOVCByb3dzIGZvciB0ZW5hbnQgVF9hMWIyYzNkNFwiIGluIG9uZSBRdWVyeS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ3RlbmFudC1lbnRpdHlUeXBlLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd0ZW5hbnRJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFN0ZXAgNCDigJQgSGFzaGVkLXNlYXJjaCBsb29rdXAgaW5kZXguXHJcbiAgICAgICAgLy8gQWZ0ZXIgU3RlcCAzIGVuY3J5cHRlZCBgZW1haWxgLCBgcWlkYCwgYHBob25lYCwgdGhlIGV4aXN0aW5nXHJcbiAgICAgICAgLy8gZW1haWwtaW5kZXggcmV0dXJucyBjaXBoZXJ0ZXh0IHRoYXQgdmFyaWVzIHBlciByb3csIHNvIGVxdWFsaXR5XHJcbiAgICAgICAgLy8gbG9va3VwcyBieSBlbWFpbCBubyBsb25nZXIgd29yay4gV2Ugc3RvcmUgYW4gSE1BQy1TSEEyNTYgaGFzaFxyXG4gICAgICAgIC8vIChgZW1haWxIYXNoYCkgYWxvbmdzaWRlIHRoZSBjaXBoZXJ0ZXh0IGFuZCBRdWVyeSB0aGlzIGluZGV4IHRvXHJcbiAgICAgICAgLy8gZmluZCBhIHJlY29yZCBieSBpdHMgcGxhaW50ZXh0IGVtYWlsIGFmdGVyIGhhc2hpbmcgdGhlIGlucHV0XHJcbiAgICAgICAgLy8gd2l0aCB0aGUgdGVuYW50J3MgS01TIEhNQUMga2V5LlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZW1haWxIYXNoLUVudGl0eVR5cGUtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsSGFzaCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvZ25pdG8gVXNlciBQb29sXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5ICsgTU9QSCBhY2Nlc3MtY29udHJvbCBleHBlY3RhdGlvbnMuXHJcbiAgICAgICAgLy8gLSBQYXNzd29yZCBwb2xpY3kgYWxpZ25lZCB3aXRoIE5DU0EgTklBOiAxMiBjaGFycyBtaW4sIGFsbCBjbGFzc2VzLlxyXG4gICAgICAgIC8vIC0gVGVtcG9yYXJ5IHBhc3N3b3JkIHZhbGlkaXR5IHJlZHVjZWQgdG8gMyBkYXlzIChmb3JjZSByb3RhdGlvbikuXHJcbiAgICAgICAgLy8gLSBNRkEgUkVRVUlSRUQgZm9yIGV2ZXJ5IHVzZXI7IFRPVFAgcHJlZmVycmVkLCBTTVMgZmFsbGJhY2suXHJcbiAgICAgICAgLy8gLSBBZHZhbmNlZCBTZWN1cml0eSBhdWRpdHMgKENvZ25pdG8gdGhyZWF0IHByb3RlY3Rpb24pIGVuZm9yY2VkLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1RpcnlhcVVzZXJQb29sJywge1xyXG4gICAgICAgICAgICB1c2VyUG9vbE5hbWU6ICd0aXJ5YXEtdXNlci1wb29sJyxcclxuICAgICAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBzaWduSW5BbGlhc2VzOiB7IHVzZXJuYW1lOiB0cnVlLCBlbWFpbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgZW1haWw6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIGZ1bGxuYW1lOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBnZW5kZXI6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHBob25lTnVtYmVyOiB7IHJlcXVpcmVkOiBmYWxzZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgYmlydGhkYXRlOiB7IHJlcXVpcmVkOiBmYWxzZSwgbXV0YWJsZTogdHJ1ZSB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgICAgICAvLyBTdGVwIDIg4oCUIE11bHRpLXRlbmFudCBmb3VuZGF0aW9uLlxyXG4gICAgICAgICAgICAvLyBgY3VzdG9tOnRlbmFudElkYCBpcyB0aGUgb3BhcXVlIElEIChlLmcuIFRfYTFiMmMzZDQpIHRoYXRcclxuICAgICAgICAgICAgLy8gdGllcyBhIHVzZXIgdG8gb25lIGhvc3BpdGFsIGN1c3RvbWVyLiBJbmplY3RlZCBpbnRvIHRoZSBKV1RcclxuICAgICAgICAgICAgLy8gYnkgdGhlIHByZS10b2tlbi1nZW5lcmF0aW9uIExhbWJkYSBhbmQgcmVhZCBieSBldmVyeSBiYWNrZW5kXHJcbiAgICAgICAgICAgIC8vIExhbWJkYSB0byBzY29wZSBEeW5hbW9EQiBxdWVyaWVzLiBNdXRhYmxlPXRydWUgc28gdGhlXHJcbiAgICAgICAgICAgIC8vIG9wZXJhdG9yIGNvbnNvbGUgY2FuIHJlLWFzc2lnbiBhIHVzZXIgKHJhcmUsIGJ1dCBwb3NzaWJsZVxyXG4gICAgICAgICAgICAvLyBmb3IgY3Jvc3MtaG9zcGl0YWwgdHJhbnNmZXJzKS5cclxuICAgICAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgIHRlbmFudElkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlLCBtaW5MZW46IDEsIG1heExlbjogNjQgfSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICAgICAgICAgIG1pbkxlbmd0aDogMTIsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBDb21wbGlhbmNlIHJlZ3Jlc3Npb246IE1GQSBmdWxseSBkaXNhYmxlZCAoUkVRVUlSRUQgLT4gT1BUSU9OQUxcclxuICAgICAgICAgICAgLy8gLT4gT0ZGKSBieSByZXF1ZXN0LiBUaGUgdHdvLXN0ZXAgcGF0aCB3YXMgbmVlZGVkIGJlY2F1c2VcclxuICAgICAgICAgICAgLy8gQ29nbml0byByZWZ1c2VzIFJFUVVJUkVEIC0+IE9GRiBkaXJlY3RseSBvbiBhIGxpdmUgcG9vbC5cclxuICAgICAgICAgICAgLy8gUmUtZW5hYmxlIGJ5IHJlc3RvcmluZyBNZmEuUkVRVUlSRUQgYW5kIHJlLWRlcGxveWluZy5cclxuICAgICAgICAgICAgbWZhOiBjb2duaXRvLk1mYS5PRkYsXHJcbiAgICAgICAgICAgIC8vIG1mYVNlY29uZEZhY3RvciBub3QgbmVlZGVkIHdoZW4gbWZhIGlzIE9GRi5cclxuICAgICAgICAgICAgLy8gbWZhU2Vjb25kRmFjdG9yOiB7IHNtczogdHJ1ZSwgb3RwOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuICAgICAgICAgICAgc3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZTogY29nbml0by5TdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlLkZVTExfRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGRldmljZVRyYWNraW5nOiB7XHJcbiAgICAgICAgICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFwcENsaWVudCA9IHVzZXJQb29sLmFkZENsaWVudCgnVGlyeWFxQXBwQ2xpZW50Jywge1xyXG4gICAgICAgICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdUaXJ5YXEnLFxyXG4gICAgICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgICAgICAgIGF1dGhGbG93czoge1xyXG4gICAgICAgICAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXNlclNycDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGN1c3RvbTogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvQXV0aDoge1xyXG4gICAgICAgICAgICAgICAgZmxvd3M6IHsgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgc2NvcGVzOiBbY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCwgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLCBjb2duaXRvLk9BdXRoU2NvcGUuUEhPTkUsIGNvZ25pdG8uT0F1dGhTY29wZS5QUk9GSUxFXSxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrVXJsczogWydodHRwOi8vbG9jYWxob3N0OjQyMDAvJywgJ2h0dHBzOi8vZDZpN2l3a25rajBiZy5jbG91ZGZyb250Lm5ldC8nXSxcclxuICAgICAgICAgICAgICAgIGxvZ291dFVybHM6IFsnaHR0cDovL2xvY2FsaG9zdDo0MjAwLycsICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQvJ11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICBpZFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdXNlclBvb2wuYWRkRG9tYWluKCdUaXJ5YXFEb21haW4nLCB7XHJcbiAgICAgICAgICAgIGNvZ25pdG9Eb21haW46IHsgZG9tYWluUHJlZml4OiAndGlyeWFxLWhvc3BpdGFsJyB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFN0ZXAgNyDigJQgQWRkIGBPcGVyYXRvcmAgZ3JvdXAgZm9yIEFrd2Fkb25hIHBsYXRmb3JtIHN0YWZmLiBNZW1iZXJzXHJcbiAgICAgICAgLy8gb2YgdGhpcyBncm91cCBhY2Nlc3MgdGhlIG9wZXJhdG9yIGNvbnNvbGUgYXQgd3d3LmFrd2Fkb25hLmNvbSxcclxuICAgICAgICAvLyBieXBhc3MgdGVuYW50SWQgY2hlY2tzLCBidXQgaGF2ZSBOTyBrbXM6RGVjcnlwdCBvbiBhbnkgdGVuYW50IGtleVxyXG4gICAgICAgIC8vIChlbmZvcmNlZCBieSB0aGUga2V5LXBvbGljeSBjb25kaXRpb24gdGhhdCBtYXRjaGVzIG9ubHkgTGFtYmRhXHJcbiAgICAgICAgLy8gZXhlY3V0aW9uIHJvbGVzLCBub3QgaHVtYW4tZGVyaXZlZCBKV1QgY2xhaW1zKS5cclxuICAgICAgICBbJ0FkbWluJywgJ0RldmVsb3BlcnMnLCAnRG9jdG9ycycsICdQaGFybWFjaXN0cycsICdPcGVyYXRvciddLmZvckVhY2goKGdyb3VwTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICBuZXcgY29nbml0by5DZm5Vc2VyUG9vbEdyb3VwKHRoaXMsIGBHcm91cCR7Z3JvdXBOYW1lfWAsIHtcclxuICAgICAgICAgICAgICAgIHVzZXJQb29sSWQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICBncm91cE5hbWUsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYCR7Z3JvdXBOYW1lfSBncm91cGBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFByZSBUb2tlbiBHZW5lcmF0aW9uIExhbWJkYVxyXG4gICAgICAgIC8vIEluamVjdHMgZW1haWwgKyBuYW1lIGZyb20gQ29nbml0byB1c2VyIGF0dHJpYnV0ZXMgaW50byB0aGVcclxuICAgICAgICAvLyBBY2Nlc3MgVG9rZW4gY2xhaW1zIHNvIGFsbCBMYW1iZGEgZnVuY3Rpb25zIGNhbiBpZGVudGlmeSB0aGUgYWN0b3IuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgcHJlVG9rZW5GbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NvZ25pdG9QcmVUb2tlbkdlbmVyYXRpb24nLCB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ2NvZ25pdG8tcHJlLXRva2VuLWdlbmVyYXRpb24nLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jb2duaXRvLXByZS10b2tlbi1nZW5lcmF0aW9uJyksXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBwcmVUb2tlbkZuLmFkZFBlcm1pc3Npb24oJ0NvZ25pdG9JbnZva2UnLCB7XHJcbiAgICAgICAgICAgIHByaW5jaXBhbDogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjb2duaXRvLWlkcC5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgICAgICAgIHNvdXJjZUFybjogdXNlclBvb2wudXNlclBvb2xBcm5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgY2ZuVXNlclBvb2wgPSB1c2VyUG9vbC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjb2duaXRvLkNmblVzZXJQb29sO1xyXG4gICAgICAgIGNmblVzZXJQb29sLmxhbWJkYUNvbmZpZyA9IHtcclxuICAgICAgICAgICAgcHJlVG9rZW5HZW5lcmF0aW9uQ29uZmlnOiB7XHJcbiAgICAgICAgICAgICAgICBsYW1iZGFBcm46IHByZVRva2VuRm4uZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgICAgICAgICBsYW1iZGFWZXJzaW9uOiAnVjNfMCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFN0ZXAgMyDigJQgUGVyLXRlbmFudCBLTVMga2V5cyBmb3IgUEhJIGVudmVsb3BlIGVuY3J5cHRpb24uXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBLZXlzIGFyZSBjcmVhdGVkIE9VVFNJREUgQ0RLICh2aWEgQVdTIENvbnNvbGUgLyBDTEkpIHNvIHRoZXkgc3Vydml2ZVxyXG4gICAgICAgIC8vIHN0YWNrIHJlYnVpbGRzIGFuZCBkb24ndCBjb3VudCBhZ2FpbnN0IHRoZSA1MDAtcmVzb3VyY2UgY2VpbGluZy5cclxuICAgICAgICAvLyBUaGUga2V5IHBvbGljaWVzIHdoaXRlbGlzdCBhbnkgcm9sZSBtYXRjaGluZ1xyXG4gICAgICAgIC8vIGBUaXJ5YXFDZGtTdGFjay0qU2VydmljZVJvbGUqYCDigJQgdGhhdCdzIGV2ZXJ5IExhbWJkYSBleGVjdXRpb24gcm9sZVxyXG4gICAgICAgIC8vIGluIHRoaXMgc3RhY2ssIGF1dG9tYXRpY2FsbHkuIE5vIElBTSBncmFudCBmcm9tIENESyBpcyBuZWVkZWQuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBUbyBvbmJvYXJkIGEgbmV3IHRlbmFudDogY3JlYXRlIGEgQ01LIGluIHVzLWVhc3QtMSB3aXRoIGFsaWFzXHJcbiAgICAgICAgLy8gYGFrd2Fkb25hLXRlbmFudC08c2x1Zz5gLCBhcHBseSB0aGUgc3RhbmRhcmQga2V5IHBvbGljeSB0ZW1wbGF0ZSxcclxuICAgICAgICAvLyB0aGVuIGFkZCBpdHMgdGVuYW50SWQg4oaSIEFSTiBlbnRyeSBiZWxvdyBhbmQgcmVkZXBsb3kuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdGVuYW50S2V5czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICAgICAgJ1RfMjU3MmZjNzEnOiAnYXJuOmF3czprbXM6dXMtZWFzdC0xOjQ4MzE3NjYzNDY2NTprZXkvMTFiMTM4NmItNTFjMi00MWFiLWI1YmEtYWE2ZWI5YTBlOGE2JywgLy8gVGlyeWFxXHJcbiAgICAgICAgICAgICdUX2E0YjhhZWY5JzogJ2Fybjphd3M6a21zOnVzLWVhc3QtMTo0ODMxNzY2MzQ2NjU6a2V5L2MxYzE2NTdiLWIzZjktNDFhOS1hODE2LWRlZTM4MmUwMGJiMScgIC8vIEFsc2hpZmFhXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU3RlcCA0IOKAlCBQZXItdGVuYW50IEtNUyBITUFDIGtleXMgZm9yIHNlYXJjaGFibGUgaGFzaGVkIGZpZWxkcy5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIFBISSBmaWVsZHMgbGlrZSBgcWlkYCwgYGVtYWlsYCwgYHBob25lYCBhcmUgbm93IGVuY3J5cHRlZCAoU3RlcCAzKSxcclxuICAgICAgICAvLyBzbyBlcXVhbGl0eSBsb29rdXBzIChmaW5kIHBhdGllbnQgYnkgUUlEKSBubyBsb25nZXIgd29yayDigJQgZXZlcnlcclxuICAgICAgICAvLyBlbmNyeXB0aW9uIHVzZXMgYSBmcmVzaCBJViwgc28gdGhlIHNhbWUgcGxhaW50ZXh0IHByb2R1Y2VzIGRpZmZlcmVudFxyXG4gICAgICAgIC8vIGNpcGhlcnRleHQgZWFjaCB0aW1lLiBUbyByZXN0b3JlIHNlYXJjaCB3ZSBzdG9yZSBhbiBITUFDLVNIQTI1NlxyXG4gICAgICAgIC8vIGhhc2ggYWxvbmdzaWRlIHRoZSBjaXBoZXJ0ZXh0OiBkZXRlcm1pbmlzdGljIHBlciAodGVuYW50LCBwbGFpbnRleHQpLFxyXG4gICAgICAgIC8vIG9uZS13YXkgKGNhbid0IHJldmVyc2UpLCB0ZW5hbnQtc2NvcGVkIChkaWZmZXJlbnQgdGVuYW50cyBwcm9kdWNlXHJcbiAgICAgICAgLy8gZGlmZmVyZW50IGhhc2hlcyBmb3IgdGhlIHNhbWUgaW5wdXQpLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gS01TIEhNQUMga2V5cyBrZWVwIHRoZSBzZWNyZXQgaW5zaWRlIHRoZSBGSVBTIDE0MC0yIEhTTSDigJQgdGhlXHJcbiAgICAgICAgLy8gaGFzaGluZyBjYWxsIGdvZXMgdG8gS01TLCB0aGUgTGFtYmRhIG5ldmVyIHNlZXMgdGhlIHNlY3JldC5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0ZW5hbnRIbWFjS2V5czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICAgICAgJ1RfMjU3MmZjNzEnOiAnYXJuOmF3czprbXM6dXMtZWFzdC0xOjQ4MzE3NjYzNDY2NTprZXkvNjAxZjhhYWItZjM3Yy00Nzg2LWE1NTctYWZjMTJjYjg2NGU4JywgLy8gVGlyeWFxIEhNQUNcclxuICAgICAgICAgICAgJ1RfYTRiOGFlZjknOiAnYXJuOmF3czprbXM6dXMtZWFzdC0xOjQ4MzE3NjYzNDY2NTprZXkvMGEyM2VhMzMtNDY1OS00ZjM3LWE0YTItYTYyMzY2MDEwYmNkJyAgLy8gQWxzaGlmYWEgSE1BQ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFNoYXJlZCBMYW1iZGEgZW52aXJvbm1lbnQgKyBoZWxwZXJcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzaGFyZWRFbnYgPSB7XHJcbiAgICAgICAgICAgIFRBQkxFX05BTUU6ICdIb3NwaXRhbCcsXHJcbiAgICAgICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgLy8gSlNPTiBtYXA6IHRlbmFudElkIOKGkiBLTVMga2V5IEFSTi4gVGhlIGNyeXB0byBoZWxwZXIgaW4gZWFjaFxyXG4gICAgICAgICAgICAvLyBMYW1iZGEgcGFyc2VzIHRoaXMgb25jZSBhbmQgdXNlcyBpdCB0byBlbmNyeXB0L2RlY3J5cHQgUEhJLlxyXG4gICAgICAgICAgICBURU5BTlRfS0VZUzogSlNPTi5zdHJpbmdpZnkodGVuYW50S2V5cyksXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgNCDigJQgSlNPTiBtYXA6IHRlbmFudElkIOKGkiBLTVMgSE1BQyBrZXkgQVJOLiBVc2VkIGJ5IHRoZVxyXG4gICAgICAgICAgICAvLyBjcnlwdG8gaGVscGVyJ3MgY29tcHV0ZUhtYWMoKSB0byBwcm9kdWNlIHNlYXJjaGFibGUgaGFzaGVzIG9mXHJcbiAgICAgICAgICAgIC8vIFBISSBmaWVsZHMuIE5ldmVyIHNlZXMgdGhlIGtleSBtYXRlcmlhbCDigJQgS01TIHJ1bnMgdGhlIE1BQy5cclxuICAgICAgICAgICAgVEVOQU5UX0hNQUNfS0VZUzogSlNPTi5zdHJpbmdpZnkodGVuYW50SG1hY0tleXMpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gTGFtYmRhIGZhY3RvcnkuXHJcbiAgICAgICAgLy8gTWVtb3J5IGJ1bXBlZCB0byA1MTIgTUIgYnkgZGVmYXVsdCDigJQgTm9kZS5qcyBjb2xkLXN0YXJ0IHNjYWxlcyB3aXRoXHJcbiAgICAgICAgLy8gQ1BVIHdoaWNoIGlzIGFsbG9jYXRlZCBwcm9wb3J0aW9uYWxseSB0byBtZW1vcnk7IDUxMiBNQiByb3VnaGx5XHJcbiAgICAgICAgLy8gaGFsdmVzIGNvbGQtc3RhcnQgdGltZSB2cyB0aGUgZGVmYXVsdCAxMjggTUIgYW5kIGlzIHN0aWxsIHBlbm5pZXMvbW9udGguXHJcbiAgICAgICAgY29uc3QgZm4gPSAoaWQ6IHN0cmluZywgZm9sZGVyOiBzdHJpbmcsIGhhbmRsZXI6IHN0cmluZywgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUgPSBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCwgZXh0cmFFbnY6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fSwgb3B0czogeyBtZW1vcnlTaXplPzogbnVtYmVyIH0gPSB7fSkgPT5cclxuICAgICAgICAgICAgbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBpZCwge1xyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBmb2xkZXIsXHJcbiAgICAgICAgICAgICAgICBydW50aW1lLFxyXG4gICAgICAgICAgICAgICAgaGFuZGxlcixcclxuICAgICAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChgbGFtYmRhLyR7Zm9sZGVyfWApLFxyXG4gICAgICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHsgLi4uc2hhcmVkRW52LCAuLi5leHRyYUVudiB9LFxyXG4gICAgICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgICAgICAgICAgbWVtb3J5U2l6ZTogb3B0cy5tZW1vcnlTaXplID8/IDUxMlxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGdldEFsbFBhdGllbnRzRm4gPSBmbignR2V0QWxsUGF0aWVudHMnLCAnZ2V0QWxsUGF0aWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFBhdGllbnRCeUlERm4gPSBmbignR2V0UGF0aWVudEJ5SUQnLCAnZ2V0UGF0aWVudEJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZVBhdGllbnRGbiA9IGZuKCdDcmVhdGVQYXRpZW50JywgJ2NyZWF0ZVBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZVBhdGllbnRGbiA9IGZuKCdVcGRhdGVQYXRpZW50JywgJ3VwZGF0ZVBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZVBhdGllbnRGbiA9IGZuKCdEZWxldGVQYXRpZW50JywgJ2RlbGV0ZVBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFBhdGllbnRzRGF0YUJ5RmlsdGVyc0ZuID0gZm4oJ0dldFBhdGllbnRzRGF0YUJ5RmlsdGVycycsICdnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbERvY3RvcnNGbiA9IGZuKCdHZXRBbGxEb2N0b3JzJywgJ2dldEFsbERvY3RvcnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldERvY3RvckJ5SURGbiA9IGZuKCdHZXREb2N0b3JCeUlEJywgJ2dldERvY3RvckJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldERvY3RvckJ5RW1haWxGbiA9IGZuKCdHZXREb2N0b3JCeUVtYWlsJywgJ2dldERvY3RvckJ5RW1haWwnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVEb2N0b3JGbiA9IGZuKCdDcmVhdGVEb2N0b3InLCAnY3JlYXRlRG9jdG9yJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCB1cGRhdGVEb2N0b3JGbiA9IGZuKCdVcGRhdGVEb2N0b3InLCAndXBkYXRlRG9jdG9yJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVEb2N0b3JGbiA9IGZuKCdEZWxldGVEb2N0b3InLCAnZGVsZXRlRG9jdG9yJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVQYXRpZW50UGF5bWVudEZuID0gZm4oJ0NyZWF0ZVBhdGllbnRQYXltZW50JywgJ2NyZWF0ZVBhdGllbnRQYXltZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxQYXltZW50c0ZvclBhdGllbnRGbiA9IGZuKCdHZXRBbGxQYXltZW50c0ZvclBhdGllbnQnLCAnZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJREZuID0gZm4oJ0xpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlEJywgJ2xpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCB1cGRhdGVQYXRpZW50UGF5bWVudEZuID0gZm4oJ1VwZGF0ZVBhdGllbnRQYXltZW50JywgJ3VwZGF0ZVBhdGllbnRQYXltZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRQYXltZW50QnlJREZuID0gZm4oJ0dldFBheW1lbnRCeUlEJywgJ2dldFBheW1lbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVQYXltZW50Rm4gPSBmbignRGVsZXRlUGF5bWVudCcsICdkZWxldGVQYXltZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxJbnZvaWNlc0ZuID0gZm4oJ0dldEFsbEludm9pY2VzJywgJ2dldEFsbEludm9pY2VzJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgLy8gY3JlYXRlUGF0aWVudFN1cmdlcnlGbiByZW1vdmVkICh3YXMgYW4gdW5pbXBsZW1lbnRlZCBzdHViKSB0byBmcmVlXHJcbiAgICAgICAgLy8gQ0ZOIHJlc291cmNlcyBmb3IgdGhlIG9wZXJhdG9yIGNvbnNvbGUuIFJlLWFkZCB3aGVuIHRoZSBzdXJnZXJ5XHJcbiAgICAgICAgLy8gbW9kdWxlIGlzIGJ1aWx0IG91dC5cclxuICAgICAgICBjb25zdCBsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SURGbiA9IGZuKCdMaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SUQnLCAnbGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRTdXJnZXJ5QnlJREZuID0gZm4oJ0dldFN1cmdlcnlCeUlEJywgJ2dldFN1cmdlcnlCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxEZXBhcnRtZW50c0ZuID0gZm4oJ0dldEFsbERlcGFydG1lbnRzJywgJ2dldEFsbERlcGFydG1lbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVOZXdEZXBhcnRtZW50Rm4gPSBmbignQ3JlYXRlTmV3RGVwYXJ0bWVudCcsICdjcmVhdGVOZXdEZXBhcnRtZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBidWxrQ3JlYXRlRGVwYXJ0bWVudHNGbiA9IGZuKCdCdWxrQ3JlYXRlRGVwYXJ0bWVudHMnLCAnYnVsa0NyZWF0ZURlcGFydG1lbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVBbGxEZXBhcnRtZW50c0ZuID0gZm4oJ0RlbGV0ZUFsbERlcGFydG1lbnRzJywgJ2RlbGV0ZUFsbERlcGFydG1lbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxTcGVjaWFsaXphdGlvbnNGbiA9IGZuKCdHZXRBbGxTcGVjaWFsaXphdGlvbnMnLCAnZ2V0QWxsU3BlY2lhbGl6YXRpb25zJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVOZXdTcGVjaWFsaXphdGlvbkZuID0gZm4oJ0NyZWF0ZU5ld1NwZWNpYWxpemF0aW9uJywgJ2NyZWF0ZU5ld1NwZWNpYWxpemF0aW9uJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zRm4gPSBmbignQnVsa0NyZWF0ZVNwZWNpYWxpemF0aW9ucycsICdidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVBbGxTcGVjaWFsaXphdGlvbnNGbiA9IGZuKCdEZWxldGVBbGxTcGVjaWFsaXphdGlvbnMnLCAnZGVsZXRlQWxsU3BlY2lhbGl6YXRpb25zJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBhZG1pblBhbmVsRm4gPSBmbignVGlyeWFxQWRtaW5QYW5lbCcsICd0aXJ5YXEtYWRtaW4tcGFuZWwnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YKTtcclxuICAgICAgICAvLyBTdGVwIDcg4oCUIE9wZXJhdG9yIGNvbnNvbGUgYmFja2VuZC5cclxuICAgICAgICAvLyBSZWFkLW1vc3RseSBMYW1iZGEgdGhhdCBzdXJmYWNlcyB0ZW5hbnQgbWV0YWRhdGEsIGNvdW50cywgYW5kXHJcbiAgICAgICAgLy8gYXVkaXQgbWV0YWRhdGEgdG8gdGhlIG9wZXJhdG9yIFVJIGF0IHd3dy5ha3dhZG9uYS5jb20uIEJ5XHJcbiAgICAgICAgLy8gY29udmVudGlvbiBpdCBuZXZlciBjYWxscyBLTVMgRGVjcnlwdCBvbiB0ZW5hbnQgZGF0YSDigJQgc2VlIHRoZVxyXG4gICAgICAgIC8vIHRvcC1vZi1maWxlIGNvbW1lbnQgaW4gdGlyeWFxLW9wZXJhdG9yLWNvbnNvbGUvaW5kZXguanMuXHJcbiAgICAgICAgY29uc3Qgb3BlcmF0b3JDb25zb2xlRm4gPSBmbignVGlyeWFxT3BlcmF0b3JDb25zb2xlJywgJ3RpcnlhcS1vcGVyYXRvci1jb25zb2xlJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCk7XHJcbiAgICAgICAgY29uc3QgZXhhbWluYXRpb25zRm4gPSBmbignVGlyeWFxRXhhbWluYXRpb25zJywgJ3RpcnlhcS1leGFtaW5hdGlvbnMnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBwaGFybWFjeUZuID0gZm4oJ1RpcnlhcVBoYXJtYWN5JywgJ3RpcnlhcS1waGFybWFjeScsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGRvY3VtZW50TWFuYWdlckZuID0gZm4oJ1RpcnlhcURvY3VtZW50TWFuYWdlcicsICd0aXJ5YXEtZG9jdW1lbnQtbWFuYWdlcicsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGF1ZGl0Rm4gPSBmbignVGlyeWFxQXVkaXQnLCAndGlyeWFxLWF1ZGl0JywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgYXBwb2ludG1lbnRzRm4gPSBmbignVGlyeWFxQXBwb2ludG1lbnRzJywgJ3RpcnlhcS1hcHBvaW50bWVudHMnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICAvLyBIb3NwaXRhbCBjYWxlbmRhciDigJQgcmVwbGFjZXMgdGhlIHByZXZpb3VzIGV4dGVybmFsIENhbGVuZGFyUGxhdGZvcm0gU2FhUy5cclxuICAgICAgICAvLyBBbGwgY2FsZW5kYXIgZGF0YSBub3cgcGVyc2lzdHMgaW4gdGhlIEhvc3BpdGFsIER5bmFtb0RCIHRhYmxlIGZvclxyXG4gICAgICAgIC8vIFBEUFBMIGRhdGEtcmVzaWRlbmN5ICsgY2xpbmljYWwtcHJpdmFjeSBjb21wbGlhbmNlLlxyXG4gICAgICAgIGNvbnN0IGNhbGVuZGFyRm4gPSBmbignVGlyeWFxQ2FsZW5kYXInLCAndGlyeWFxLWNhbGVuZGFyJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCk7XHJcbiAgICAgICAgLy8gQmxvb2QgQmFuayBtb2R1bGUg4oCUIGRvbm9ycyAvIGRvbmF0aW9ucyAvIGludmVudG9yeSAvIHJlcXVlc3RzIC8gY3Jvc3NtYXRjaCAvIGlzc3VlLlxyXG4gICAgICAgIGNvbnN0IGJsb29kYmFua0ZuID0gZm4oJ1RpcnlhcUJsb29kYmFuaycsICd0aXJ5YXEtYmxvb2RiYW5rJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFNjcmliZUZpcnN0IFBoYXNlIDEg4oCUIFNPQVAgZ2VuZXJhdGlvbiBMYW1iZGEuXHJcbiAgICAgICAgLy8gQ2FsbHMgQmVkcm9jayBmb3IgdHJhbnNjcmlwdCDihpIgU09BUCBzcGxpdDsgd3JpdGVzIHNlc3Npb24gKyBhdWRpdFxyXG4gICAgICAgIC8vIHJvd3MgdG8gdGhlIGV4aXN0aW5nIHNpbmdsZS10YWJsZS5cclxuICAgICAgICAvLyBCRURST0NLX1JFR0lPTiBjYW4gZGlmZmVyIGZyb20gQVdTX1JFR0lPTiB3aGVuIEJlZHJvY2sgaXNuJ3QgeWV0XHJcbiAgICAgICAgLy8gYXZhaWxhYmxlIGluIHRoZSBkYXRhLXBsYW5lIHJlZ2lvbiAoZS5nLiBtZS1zb3V0aC0xIHByb2R1Y3Rpb24pLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNjcmliZUZuID0gZm4oXHJcbiAgICAgICAgICAgICdUaXJ5YXFTY3JpYmUnLFxyXG4gICAgICAgICAgICAndGlyeWFxLXNjcmliZScsXHJcbiAgICAgICAgICAgICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICAgICAgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIEJFRFJPQ0tfUkVHSU9OOiAndXMtZWFzdC0xJyxcclxuICAgICAgICAgICAgICAgIC8vIENsYXVkZSAzLjUgSGFpa3UgdmlhIHRoZSBVUyBjcm9zcy1yZWdpb24gaW5mZXJlbmNlIHByb2ZpbGUuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGUgb3JpZ2luYWwgY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDcgbW9kZWwgd2FzIHJldGlyZWQvbWFya2VkXHJcbiAgICAgICAgICAgICAgICAvLyBsZWdhY3kgYnkgdGhlIHByb3ZpZGVyLCB3aGljaCBjYXVzZWQgSW52b2tlTW9kZWwgQWNjZXNzRGVuaWVkLlxyXG4gICAgICAgICAgICAgICAgLy8gTmV3ZXIgQW50aHJvcGljIG1vZGVscyBvbiBCZWRyb2NrIGFyZSBvbmx5IGludm9rYWJsZSB0aHJvdWdoIGFuXHJcbiAgICAgICAgICAgICAgICAvLyBpbmZlcmVuY2UgcHJvZmlsZSAodGhlIFwidXMuXCIgcHJlZml4KSwgbm90IHRoZSBiYXJlIG1vZGVsIElELlxyXG4gICAgICAgICAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogJ3VzLmFudGhyb3BpYy5jbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxLXYxOjAnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgICAgIC8vIEFsbG93IEJlZHJvY2sgSW52b2tlTW9kZWwgb24gdGhlIENsYXVkZSAzLjUgSGFpa3UgVVMgaW5mZXJlbmNlIHByb2ZpbGUuXHJcbiAgICAgICAgLy8gQSBjcm9zcy1yZWdpb24gaW5mZXJlbmNlIHByb2ZpbGUgcmVxdWlyZXMgcGVybWlzc2lvbiBvbiBCT1RIIHRoZVxyXG4gICAgICAgIC8vIHByb2ZpbGUgQVJOIGFuZCB0aGUgdW5kZXJseWluZyBmb3VuZGF0aW9uLW1vZGVsIEFSTnMgaW4gZXZlcnkgcmVnaW9uXHJcbiAgICAgICAgLy8gdGhlIHByb2ZpbGUgY2FuIHJvdXRlIHRvICh1cy1lYXN0LTEgLyB1cy1lYXN0LTIgLyB1cy13ZXN0LTIpLlxyXG4gICAgICAgIHNjcmliZUZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydiZWRyb2NrOkludm9rZU1vZGVsJ10sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICBgYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMToke3RoaXMuYWNjb3VudH06aW5mZXJlbmNlLXByb2ZpbGUvdXMuYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MGAsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy13ZXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCdcclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBEeW5hbW9EQiBwZXJtaXNzaW9uc1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGFsbEZ1bmN0aW9ucyA9IFtcclxuICAgICAgICAgICAgZ2V0QWxsUGF0aWVudHNGbixcclxuICAgICAgICAgICAgZ2V0UGF0aWVudEJ5SURGbixcclxuICAgICAgICAgICAgY3JlYXRlUGF0aWVudEZuLFxyXG4gICAgICAgICAgICB1cGRhdGVQYXRpZW50Rm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZVBhdGllbnRGbixcclxuICAgICAgICAgICAgZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzRm4sXHJcbiAgICAgICAgICAgIGdldEFsbERvY3RvcnNGbixcclxuICAgICAgICAgICAgZ2V0RG9jdG9yQnlJREZuLFxyXG4gICAgICAgICAgICBnZXREb2N0b3JCeUVtYWlsRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZURvY3RvckZuLFxyXG4gICAgICAgICAgICB1cGRhdGVEb2N0b3JGbixcclxuICAgICAgICAgICAgZGVsZXRlRG9jdG9yRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZVBhdGllbnRQYXltZW50Rm4sXHJcbiAgICAgICAgICAgIGdldEFsbFBheW1lbnRzRm9yUGF0aWVudEZuLFxyXG4gICAgICAgICAgICBsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJREZuLFxyXG4gICAgICAgICAgICB1cGRhdGVQYXRpZW50UGF5bWVudEZuLFxyXG4gICAgICAgICAgICBnZXRQYXltZW50QnlJREZuLFxyXG4gICAgICAgICAgICBkZWxldGVQYXltZW50Rm4sXHJcbiAgICAgICAgICAgIGdldEFsbEludm9pY2VzRm4sXHJcbiAgICAgICAgICAgIGxpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJREZuLFxyXG4gICAgICAgICAgICBnZXRTdXJnZXJ5QnlJREZuLFxyXG4gICAgICAgICAgICBnZXRBbGxEZXBhcnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBjcmVhdGVOZXdEZXBhcnRtZW50Rm4sXHJcbiAgICAgICAgICAgIGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBkZWxldGVBbGxEZXBhcnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBnZXRBbGxTcGVjaWFsaXphdGlvbnNGbixcclxuICAgICAgICAgICAgY3JlYXRlTmV3U3BlY2lhbGl6YXRpb25GbixcclxuICAgICAgICAgICAgYnVsa0NyZWF0ZVNwZWNpYWxpemF0aW9uc0ZuLFxyXG4gICAgICAgICAgICBkZWxldGVBbGxTcGVjaWFsaXphdGlvbnNGbixcclxuICAgICAgICAgICAgYWRtaW5QYW5lbEZuLFxyXG4gICAgICAgICAgICBvcGVyYXRvckNvbnNvbGVGbixcclxuICAgICAgICAgICAgZXhhbWluYXRpb25zRm4sXHJcbiAgICAgICAgICAgIHBoYXJtYWN5Rm4sXHJcbiAgICAgICAgICAgIGRvY3VtZW50TWFuYWdlckZuLFxyXG4gICAgICAgICAgICBhdWRpdEZuLFxyXG4gICAgICAgICAgICBhcHBvaW50bWVudHNGbixcclxuICAgICAgICAgICAgY2FsZW5kYXJGbixcclxuICAgICAgICAgICAgYmxvb2RiYW5rRm4sXHJcbiAgICAgICAgICAgIHNjcmliZUZuXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgYWxsRnVuY3Rpb25zLmZvckVhY2goKGYpID0+IHtcclxuICAgICAgICAgICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGYpO1xyXG4gICAgICAgICAgICAvLyBDb21wbGlhbmNlOiBMYW1iZGEgZXhlY3V0aW9uIHJvbGVzIG11c3QgYmUgZXhwbGljaXRseSBncmFudGVkXHJcbiAgICAgICAgICAgIC8vIEtNUyBFbmNyeXB0L0RlY3J5cHQgb24gdGhlIGRhdGEgQ01LIGJlY2F1c2UgRHluYW1vREIgQ1VTVE9NRVJfTUFOQUdFRFxyXG4gICAgICAgICAgICAvLyBlbmNyeXB0aW9uIHJlcXVpcmVzIHRoZSBjYWxsZXIgcHJpbmNpcGFsIHRvIGhhdmUga2V5IGFjY2Vzcy5cclxuICAgICAgICAgICAgdGlyeWFxRGF0YUtleS5ncmFudEVuY3J5cHREZWNyeXB0KGYpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTdGVwIDcgY2xlYW51cCDigJQgRXZlbnRCcmlkZ2Ugd2FybWVyIHJlbW92ZWQgdG8gZnJlZSBDRk4gcmVzb3VyY2VzXHJcbiAgICAgICAgLy8gZm9yIHRoZSBvcGVyYXRvciBjb25zb2xlLiBBdCBvdXIgdHJhZmZpYyBsZXZlbHMgTGFtYmRhIGNvbnRhaW5lcnNcclxuICAgICAgICAvLyBzdGF5IHdhcm0gbmF0dXJhbGx5LCBhbmQgdGhlIHdhcm1lcidzIDYgcmVzb3VyY2VzICgxIHJ1bGUgKyA1XHJcbiAgICAgICAgLy8gTGFtYmRhIHBlcm1pc3Npb25zKSB3ZXJlIGVhdGluZyBpbnRvIG91ciA1MDAtcmVzb3VyY2UgYnVkZ2V0LlxyXG4gICAgICAgIC8vIFRoZSBMYW1iZGFzIHN0aWxsIHNob3J0LWNpcmN1aXQgb24gYF93YXJtdXBgIGV2ZW50cyBzbyBhbnkgZnV0dXJlXHJcbiAgICAgICAgLy8gcmUtaW50cm9kdWN0aW9uIChvciBleHRlcm5hbCBwaW5nZXIpIHdvcmtzIHdpdGhvdXQgY29kZSBjaGFuZ2UuXHJcblxyXG4gICAgICAgIC8vIFNlZWQgTGFtYmRhIGFsc28gd3JpdGVzIHRvIHRoZSBlbmNyeXB0ZWQgdGFibGUuXHJcbiAgICAgICAgLy8gKGdyYW50ZWQgZnVydGhlciBkb3duIHdoZXJlIHNlZWRGbiBpcyBkZWZpbmVkLilcclxuXHJcbiAgICAgICAgYWRtaW5QYW5lbEZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpMaXN0VXNlcnMnLCAnY29nbml0by1pZHA6TGlzdFVzZXJzSW5Hcm91cCcsICdjb2duaXRvLWlkcDpBZG1pbkRpc2FibGVVc2VyJywgJ2NvZ25pdG8taWRwOkFkbWluRW5hYmxlVXNlcicsICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gRG9jdW1lbnRzIGJ1Y2tldCBhY2Nlc3MgaXMgZ3JhbnRlZCBvbiB0aGUgYnVja2V0IGNvbnN0cnVjdCBiZWxvd1xyXG4gICAgICAgIC8vIChzZWUgVGlyeWFxRG9jdW1lbnRzQnVja2V0KSwgc28gbm8gY3Jvc3MtYWNjb3VudCBpbmxpbmUgcG9saWN5IGhlcmUuXHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFNlZWQgTGFtYmRhIOKAlCBkZXBhcnRtZW50cywgc3BlY2lhbGl6YXRpb25zLCBjb3VudGVyc1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNlZWRGbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RpcnlhcVNlZWRGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAndGlyeWFxLXNlZWQnLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHsgVEFCTEVfTkFNRTogJ0hvc3BpdGFsJyB9LFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuY29uc3QgeyBEeW5hbW9EQkNsaWVudCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJyk7XHJcbmNvbnN0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvbGliLWR5bmFtb2RiJyk7XHJcbmNvbnN0IHsgcmFuZG9tVVVJRCB9ID0gcmVxdWlyZSgnY3J5cHRvJyk7XHJcbmNvbnN0IGNsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShuZXcgRHluYW1vREJDbGllbnQoe30pKTtcclxuY29uc3QgVEFCTEUgID0gcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRTtcclxuY29uc3QgREVQQVJUTUVOVFMgPSAke0pTT04uc3RyaW5naWZ5KERFUEFSVE1FTlRTKX07XHJcbmNvbnN0IFNQRUNJQUxJWkFUSU9OUyA9ICR7SlNPTi5zdHJpbmdpZnkoU1BFQ0lBTElaQVRJT05TKX07XHJcblxyXG4vLyBhdHRyaWJ1dGVfbm90X2V4aXN0cyhQSykgbWFrZXMgZXZlcnkgUHV0IGlkZW1wb3RlbnQg4oCUIGV4aXN0aW5nIHJvd3MgYXJlXHJcbi8vIHByZXNlcnZlZC4gVGhpcyBwcm90ZWN0cyB0aGUgcGF0aWVudC9kb2N0b3IgY291bnRlcnMgZnJvbSBiZWluZyByZXNldCBvblxyXG4vLyBhbnkgZnV0dXJlIHJlcGxheSBvZiB0aGlzIEN1c3RvbVJlc291cmNlLlxyXG5hc3luYyBmdW5jdGlvbiBwdXRJZkFic2VudChpdGVtKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IGNsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgICAgVGFibGVOYW1lOiBUQUJMRSxcclxuICAgICAgICAgICAgSXRlbTogaXRlbSxcclxuICAgICAgICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogJ2F0dHJpYnV0ZV9ub3RfZXhpc3RzKFBLKSdcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgaWYgKGUubmFtZSA9PT0gJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWRFeGNlcHRpb24nKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgdGhyb3cgZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgICAvLyBSZXF1ZXN0VHlwZSBoYW5kbGluZzpcclxuICAgIC8vICAgQ3JlYXRlIOKGkiBydW4gdGhlIGZ1bGwgc2VlZC5cclxuICAgIC8vICAgVXBkYXRlIOKGkiBOTy1PUC4gUmVmZXJlbmNlIGRhdGEgKGRlcGFydG1lbnRzLCBzcGVjaWFsaXphdGlvbnMpIGFuZFxyXG4gICAgLy8gICAgICAgICAgICBsaXZlIGNvdW50ZXJzIG11c3Qgbm90IGJlIHJlZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHkuIFRvXHJcbiAgICAvLyAgICAgICAgICAgIHJlLXNlZWQgaW50ZW50aW9uYWxseSwgcmVwbGFjZSB0aGlzIEN1c3RvbVJlc291cmNlIHZpYVxyXG4gICAgLy8gICAgICAgICAgICBjb25zb2xlIG9yIGJ1bXAgdGhlIGxvZ2ljYWwgaWQuXHJcbiAgICAvLyAgIERlbGV0ZSDihpIgTk8tT1AuIE5ldmVyIGRlc3Ryb3kgc2VlZGVkIHJlZmVyZW5jZSBkYXRhIG9uIHN0YWNrIGRlbGV0ZS5cclxuICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSAhPT0gJ0NyZWF0ZScpIHtcclxuICAgICAgICByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6ICdzZWVkJywgRGF0YTogeyBza2lwcGVkOiBldmVudC5SZXF1ZXN0VHlwZSB9IH07XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBsZXQgd3JpdHRlbiA9IDA7XHJcbiAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogJ0NPVU5URVIjUEFUSUVOVFMnLCBTSzogJ0NPVU5URVInLCBjb3VudDogMCwgRW50aXR5VHlwZTogJ0NPVU5URVInIH0pKSB3cml0dGVuKys7XHJcbiAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogJ0NPVU5URVIjRE9DVE9SUycsICBTSzogJ0NPVU5URVInLCBjb3VudDogMCwgRW50aXR5VHlwZTogJ0NPVU5URVInIH0pKSB3cml0dGVuKys7XHJcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgREVQQVJUTUVOVFMpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHJhbmRvbVVVSUQoKTtcclxuICAgICAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogXFxgREVQQVJUTUVOVCNcXCR7aWR9XFxgLCBTSzogJ1BST0ZJTEUnLCBFbnRpdHlUeXBlOiAnREVQQVJUTUVOVCcsIGRlcGFydG1lbnRJZDogaWQsIG5hbWUsIGNyZWF0ZWRBdDogbm93IH0pKSB3cml0dGVuKys7XHJcbiAgICB9XHJcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgU1BFQ0lBTElaQVRJT05TKSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSByYW5kb21VVUlEKCk7XHJcbiAgICAgICAgaWYgKGF3YWl0IHB1dElmQWJzZW50KHsgUEs6IFxcYFNQRUNJQUxJWkFUSU9OI1xcJHtpZH1cXGAsIFNLOiAnUFJPRklMRScsIEVudGl0eVR5cGU6ICdTUEVDSUFMSVpBVElPTicsIHNwZWNpYWxpemF0aW9uSWQ6IGlkLCBuYW1lLCBjcmVhdGVkQXQ6IG5vdyB9KSkgd3JpdHRlbisrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAnc2VlZCcsIERhdGE6IHsgd3JpdHRlbiB9IH07XHJcbn07XHJcbiAgICAgICAgICAgIGApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmdyYW50V3JpdGVEYXRhKHNlZWRGbik7XHJcbiAgICAgICAgdGlyeWFxRGF0YUtleS5ncmFudEVuY3J5cHREZWNyeXB0KHNlZWRGbik7XHJcbiAgICAgICAgY29uc3Qgc2VlZFByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdTZWVkUHJvdmlkZXInLCB7IG9uRXZlbnRIYW5kbGVyOiBzZWVkRm4gfSk7XHJcbiAgICAgICAgLy8gU3RhYmxlIHByb3BlcnR5IOKAlCBzYW1lIG9uIGV2ZXJ5IHN5bnRoIOKAlCBzbyBDbG91ZEZvcm1hdGlvbiBkb2VzIE5PVFxyXG4gICAgICAgIC8vIHJlLXRyaWdnZXIgYW4gVXBkYXRlIG9mIHRoZSBTZWVkRGF0YSBDdXN0b21SZXNvdXJjZSBvbiBgY2RrIGRlcGxveWAuXHJcbiAgICAgICAgLy8gUHJldmlvdXNseSBgdGltZXN0YW1wOiBEYXRlLm5vdygpYCBjYXVzZWQgdGhlIHNlZWQgTGFtYmRhIHRvIHJ1biBvblxyXG4gICAgICAgIC8vIGV2ZXJ5IGRlcGxveSwgcmVzZXR0aW5nIHBhdGllbnQvZG9jdG9yIGNvdW50ZXJzIGFuZCBkdXBsaWNhdGluZ1xyXG4gICAgICAgIC8vIGRlcGFydG1lbnQvc3BlY2lhbGl6YXRpb24gcmVjb3Jkcy5cclxuICAgICAgICBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsICdTZWVkRGF0YScsIHtcclxuICAgICAgICAgICAgc2VydmljZVRva2VuOiBzZWVkUHJvdmlkZXIuc2VydmljZVRva2VuLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHNlZWRWZXJzaW9uOiAxIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5IOKAlCBubyBzaGFyZWQgLyBoYXJkY29kZWQgY3JlZGVudGlhbHMuXHJcbiAgICAgICAgLy8gRWFjaCBzZWVkZWQgdXNlciBnZXRzIGEgQ1JZUFRPR1JBUEhJQ0FMTFkgUkFORE9NIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgICAgIC8vIHRoYXQgc2F0aXNmaWVzIHRoZSBzdHJlbmd0aGVuZWQgcGFzc3dvcmQgcG9saWN5LiBUaGUgcGFzc3dvcmQgaXM6XHJcbiAgICAgICAgLy8gICAtIGlzc3VlZCBhcyBURU1QT1JBUlkgKFBlcm1hbmVudD1mYWxzZSkgc28gQ29nbml0byBmb3JjZXMgYVxyXG4gICAgICAgIC8vICAgICBwYXNzd29yZCBjaGFuZ2UgYXQgZmlyc3QgbG9naW4sXHJcbiAgICAgICAgLy8gICAtIHN0b3JlZCBpbiBBV1MgU2VjcmV0cyBNYW5hZ2VyIHVuZGVyXHJcbiAgICAgICAgLy8gICAgIC90aXJ5YXEvc2VlZC11c2Vycy88dXNlcm5hbWU+LCBlbmNyeXB0ZWQgd2l0aCB0aGUgZGF0YSBDTUssXHJcbiAgICAgICAgLy8gICAtIG5ldmVyIGxvZ2dlZCwgbmV2ZXIgcmV0dXJuZWQgdG8gdGhlIEFQSSBjYWxsZXIuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdXNlcnNGbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RpcnlhcVVzZXJzRnVuY3Rpb24nLCB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ3RpcnlhcS1jcmVhdGUtdXNlcnMnLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgIERBVEFfS01TX0tFWV9JRDogdGlyeWFxRGF0YUtleS5rZXlJZFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuY29uc3QgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCwgQWRtaW5BZGRVc2VyVG9Hcm91cENvbW1hbmQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJyk7XHJcbmNvbnN0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIENyZWF0ZVNlY3JldENvbW1hbmQsIFB1dFNlY3JldFZhbHVlQ29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcicpO1xyXG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcclxuXHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoe30pO1xyXG5jb25zdCBzZWNyZXRzID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHt9KTtcclxuY29uc3QgUE9PTCA9IHByb2Nlc3MuZW52LlVTRVJfUE9PTF9JRDtcclxuY29uc3QgS0VZICA9IHByb2Nlc3MuZW52LkRBVEFfS01TX0tFWV9JRDtcclxuXHJcbmNvbnN0IFNFRURfVVNFUlMgPSBbXHJcbiAgICB7IHVzZXJuYW1lOiAnYWRtaW4xJywgICAgICBuYW1lOiAnQWRtaW4gT25lJywgICAgICBlbWFpbDogJ2FkbWluMUB0aXJ5YXEuY29tJywgICAgICBncm91cDogJ0FkbWluJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2FkbWluMicsICAgICAgbmFtZTogJ0FkbWluIFR3bycsICAgICAgZW1haWw6ICdhZG1pbjJAdGlyeWFxLmNvbScsICAgICAgZ3JvdXA6ICdBZG1pbicgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkZXZlbG9wZXIxJywgIG5hbWU6ICdEZXZlbG9wZXIgT25lJywgIGVtYWlsOiAnZGV2MUB0aXJ5YXEuY29tJywgICAgICAgIGdyb3VwOiAnRGV2ZWxvcGVycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkZXZlbG9wZXIyJywgIG5hbWU6ICdEZXZlbG9wZXIgVHdvJywgIGVtYWlsOiAnZGV2MkB0aXJ5YXEuY29tJywgICAgICAgIGdyb3VwOiAnRGV2ZWxvcGVycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkb2N0b3IxJywgICAgIG5hbWU6ICdEb2N0b3IgT25lJywgICAgIGVtYWlsOiAnZG9jdG9yMUB0aXJ5YXEuY29tJywgICAgIGdyb3VwOiAnRG9jdG9ycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkb2N0b3IyJywgICAgIG5hbWU6ICdEb2N0b3IgVHdvJywgICAgIGVtYWlsOiAnZG9jdG9yMkB0aXJ5YXEuY29tJywgICAgIGdyb3VwOiAnRG9jdG9ycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdwaGFybWFjaXN0MScsIG5hbWU6ICdQaGFybWFjaXN0IE9uZScsIGVtYWlsOiAncGhhcm1hY2lzdDFAdGlyeWFxLmNvbScsIGdyb3VwOiAnUGhhcm1hY2lzdHMnIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAncGhhcm1hY2lzdDInLCBuYW1lOiAnUGhhcm1hY2lzdCBUd28nLCBlbWFpbDogJ3BoYXJtYWNpc3QyQHRpcnlhcS5jb20nLCBncm91cDogJ1BoYXJtYWNpc3RzJyB9XHJcbl07XHJcblxyXG4vLyBHZW5lcmF0ZXMgYSAyMC1jaGFyIHBhc3N3b3JkIHRoYXQgYWx3YXlzIHNhdGlzZmllcyB0aGUgcG9saWN5OlxyXG4vLyB1cHBlciwgbG93ZXIsIGRpZ2l0LCBzeW1ib2wsIGxlbmd0aCA+PSAxMi5cclxuZnVuY3Rpb24gZ2VuZXJhdGVUZW1wUGFzc3dvcmQoKSB7XHJcbiAgICBjb25zdCB1cHBlciA9ICdBQkNERUZHSEpLTE1OUFFSU1RVVldYWVonO1xyXG4gICAgY29uc3QgbG93ZXIgPSAnYWJjZGVmZ2hpamttbnBxcnN0dXZ3eHl6JztcclxuICAgIGNvbnN0IGRpZ2l0ID0gJzIzNDU2Nzg5JztcclxuICAgIGNvbnN0IHN5bWJvbCA9ICchQCMkJV4mKigpLV89Kyc7XHJcbiAgICBjb25zdCBhbGwgPSB1cHBlciArIGxvd2VyICsgZGlnaXQgKyBzeW1ib2w7XHJcbiAgICBjb25zdCBwaWNrID0gKHNldCkgPT4gc2V0W2NyeXB0by5yYW5kb21JbnQoMCwgc2V0Lmxlbmd0aCldO1xyXG4gICAgbGV0IHB3ZCA9IHBpY2sodXBwZXIpICsgcGljayhsb3dlcikgKyBwaWNrKGRpZ2l0KSArIHBpY2soc3ltYm9sKTtcclxuICAgIHdoaWxlIChwd2QubGVuZ3RoIDwgMjApIHB3ZCArPSBwaWNrKGFsbCk7XHJcbiAgICByZXR1cm4gcHdkLnNwbGl0KCcnKS5zb3J0KCgpID0+IGNyeXB0by5yYW5kb21JbnQoMCwgMikgLSAxKS5qb2luKCcnKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc3RvcmVTZWNyZXQodXNlcm5hbWUsIHBhc3N3b3JkKSB7XHJcbiAgICBjb25zdCBuYW1lID0gJy90aXJ5YXEvc2VlZC11c2Vycy8nICsgdXNlcm5hbWU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHNlY3JldHMuc2VuZChuZXcgQ3JlYXRlU2VjcmV0Q29tbWFuZCh7XHJcbiAgICAgICAgICAgIE5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgIERlc2NyaXB0aW9uOiAnVGVtcG9yYXJ5IHBhc3N3b3JkIGZvciBzZWVkZWQgVGlyeWFxIHVzZXIg4oCUIG11c3QgYmUgY2hhbmdlZCBvbiBmaXJzdCBsb2dpbi4nLFxyXG4gICAgICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWUsIHRlbXBvcmFyeVBhc3N3b3JkOiBwYXNzd29yZCwgbXVzdENoYW5nZTogdHJ1ZSB9KSxcclxuICAgICAgICAgICAgS21zS2V5SWQ6IEtFWVxyXG4gICAgICAgIH0pKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBpZiAoZS5uYW1lID09PSAnUmVzb3VyY2VFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHNlY3JldHMuc2VuZChuZXcgUHV0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgICAgICAgICAgIFNlY3JldElkOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lLCB0ZW1wb3JhcnlQYXNzd29yZDogcGFzc3dvcmQsIG11c3RDaGFuZ2U6IHRydWUgfSlcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0RlbGV0ZScpIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3VzZXJzJyB9O1xyXG4gICAgZm9yIChjb25zdCB1c2VyIG9mIFNFRURfVVNFUlMpIHtcclxuICAgICAgICBjb25zdCB0ZW1wUGFzc3dvcmQgPSBnZW5lcmF0ZVRlbXBQYXNzd29yZCgpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFBlcm1hbmVudD1mYWxzZSAoZGVmYXVsdCkg4oaSIENvZ25pdG8gZmxhZ3MgRk9SQ0VfQ0hBTkdFX1BBU1NXT1JELlxyXG4gICAgICAgICAgICBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluQ3JlYXRlVXNlckNvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgVXNlclBvb2xJZDogUE9PTCxcclxuICAgICAgICAgICAgICAgIFVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgTWVzc2FnZUFjdGlvbjogJ1NVUFBSRVNTJyxcclxuICAgICAgICAgICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgICAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgICAgICAgICAgVmFsdWU6IHVzZXIuZW1haWwgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICduYW1lJywgICAgICAgICAgIFZhbHVlOiB1c2VyLm5hbWUgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICdnZW5kZXInLCAgICAgICAgIFZhbHVlOiAnTWFsZScgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGF3YWl0IGNvZ25pdG8uc2VuZChuZXcgQWRtaW5BZGRVc2VyVG9Hcm91cENvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgVXNlclBvb2xJZDogUE9PTCwgVXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsIEdyb3VwTmFtZTogdXNlci5ncm91cFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHN0b3JlU2VjcmV0KHVzZXIudXNlcm5hbWUsIHRlbXBQYXNzd29yZCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBpZiAoZS5uYW1lID09PSAnVXNlcm5hbWVFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBVc2VyIGFscmVhZHkgZXhpc3RzIOKAlCBkbyBub3QgcmVzZXQgdGhlaXIgcGFzc3dvcmQgc2lsZW50bHkuXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3VzZXJzJyB9O1xyXG59O1xyXG4gICAgICAgICAgICBgKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB1c2Vyc0ZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkFkZFVzZXJUb0dyb3VwJ1xyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHVzZXJzRm4uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkNyZWF0ZVNlY3JldCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOlB1dFNlY3JldFZhbHVlJyxcclxuICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6RGVzY3JpYmVTZWNyZXQnXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtyZWdpb259OiR7YWNjb3VudElkfTpzZWNyZXQ6L3RpcnlhcS9zZWVkLXVzZXJzLypgXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIExhbWJkYSBtdXN0IGJlIGFsbG93ZWQgdG8gdXNlIHRoZSBkYXRhIENNSyB0byBlbmNyeXB0IHRoZSBzZWNyZXQuXHJcbiAgICAgICAgdGlyeWFxRGF0YUtleS5ncmFudEVuY3J5cHREZWNyeXB0KHVzZXJzRm4pO1xyXG5cclxuICAgICAgICBjb25zdCB1c2Vyc1Byb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdVc2Vyc1Byb3ZpZGVyJywgeyBvbkV2ZW50SGFuZGxlcjogdXNlcnNGbiB9KTtcclxuICAgICAgICBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsICdDcmVhdGVVc2VycycsIHtcclxuICAgICAgICAgICAgc2VydmljZVRva2VuOiB1c2Vyc1Byb3ZpZGVyLnNlcnZpY2VUb2tlbixcclxuICAgICAgICAgICAgcHJvcGVydGllczogeyB1c2VyUG9vbElkOiB1c2VyUG9vbC51c2VyUG9vbElkIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgKyBKV1QgQXV0aG9yaXplclxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgSHR0cEp3dEF1dGhvcml6ZXIoJ1RpcnlhcUF1dGhvcml6ZXInLCBgaHR0cHM6Ly9jb2duaXRvLWlkcC4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8ke3VzZXJQb29sLnVzZXJQb29sSWR9YCwge1xyXG4gICAgICAgICAgICBqd3RBdWRpZW5jZTogW2FwcENsaWVudC51c2VyUG9vbENsaWVudElkXSxcclxuICAgICAgICAgICAgaWRlbnRpdHlTb3VyY2U6IFsnJHJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkgKGludGVncml0eSAmIGNvbmZpZGVudGlhbGl0eSkuXHJcbiAgICAgICAgLy8gQ09SUyBpcyByZXN0cmljdGVkIHRvIHRoZSBwcm9kdWN0aW9uIENsb3VkRnJvbnQgZG9tYWluIHBsdXMgbG9jYWxob3N0XHJcbiAgICAgICAgLy8gZm9yIGRldi4gV2lsZGNhcmQgb3JpZ2lucyBhcmUgZm9yYmlkZGVuIOKAlCB0aGV5IGVuYWJsZSBjcm9zcy1zaXRlIGRhdGFcclxuICAgICAgICAvLyBleGZpbHRyYXRpb24gZnJvbSB0aGUgcGF0aWVudCdzIGJyb3dzZXIuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU3RlcCAyIC8gU3RlcCAzIGZpeCDigJQgZXZlcnkgdGVuYW50IHN1YmRvbWFpbiBtdXN0IGJlIG9uIHRoaXMgbGlzdCxcclxuICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGJyb3dzZXIgcmVqZWN0cyBBUEkgY2FsbHMgZnJvbSB0aXJ5YXEuYWt3YWRvbmEuY29tLFxyXG4gICAgICAgIC8vIGFsc2hpZmFhLmFrd2Fkb25hLmNvbSwgZXRjLiBBZGQgdGhlIG5ldyBzbHVnIGhlcmUgd2hlbmV2ZXIgYVxyXG4gICAgICAgIC8vIHRlbmFudCBpcyBvbmJvYXJkZWQgKHNhbWUgbGlzdCBsaXZlcyBpbiBzcmMvYXBwL3NlcnZpY2VzL3RlbmFudC5zZXJ2aWNlLnRzKS5cclxuICAgICAgICBjb25zdCB0ZW5hbnRTbHVncyA9IFsndGlyeWFxJywgJ2Fsc2hpZmFhJ107XHJcbiAgICAgICAgY29uc3QgdGVuYW50T3JpZ2lucyA9IHRlbmFudFNsdWdzLm1hcChzbHVnID0+IGBodHRwczovLyR7c2x1Z30uYWt3YWRvbmEuY29tYCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFsbG93ZWRPcmlnaW5zID0gW1xyXG4gICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo0MjAwJyxcclxuICAgICAgICAgICAgJ2h0dHBzOi8vZDZpN2l3a25rajBiZy5jbG91ZGZyb250Lm5ldCcsXHJcbiAgICAgICAgICAgICdodHRwczovL2Frd2Fkb25hLmNvbScsXHJcbiAgICAgICAgICAgICdodHRwczovL3d3dy5ha3dhZG9uYS5jb20nLFxyXG4gICAgICAgICAgICAuLi50ZW5hbnRPcmlnaW5zXHJcbiAgICAgICAgXTtcclxuICAgICAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ3d2Mi5IdHRwQXBpKHRoaXMsICdUaXJ5YXFIdHRwQXBpJywge1xyXG4gICAgICAgICAgICBhcGlOYW1lOiAndGlyeWFxLWFwaScsXHJcbiAgICAgICAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcclxuICAgICAgICAgICAgICAgIGFsbG93T3JpZ2luczogYWxsb3dlZE9yaWdpbnMsXHJcbiAgICAgICAgICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgICAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgICAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBPU1QsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QQVRDSCxcclxuICAgICAgICAgICAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcclxuICAgICAgICAgICAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLk9QVElPTlNcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1DbGllbnQtUmVxdWVzdC1JZCddLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dDcmVkZW50aWFsczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5taW51dGVzKDEwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHJvdXRlID0gKHBhdGg6IHN0cmluZywgbWV0aG9kczogYXBpZ3d2Mi5IdHRwTWV0aG9kW10sIGhhbmRsZXI6IGxhbWJkYS5GdW5jdGlvbikgPT5cclxuICAgICAgICAgICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgICAgICAgICAgICBwYXRoLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kcyxcclxuICAgICAgICAgICAgICAgIGludGVncmF0aW9uOiBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKHBhdGgucmVwbGFjZSgvW15hLXpBLVowLTldL2csICcnKSArIG1ldGhvZHMuam9pbignJyksIGhhbmRsZXIpLFxyXG4gICAgICAgICAgICAgICAgYXV0aG9yaXplclxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsUGF0aWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZVBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0UGF0aWVudEJ5SURGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCB1cGRhdGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZVBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9yZXN0b3JlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHVwZGF0ZVBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy9zZWFyY2gnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFBhdGllbnRzRGF0YUJ5RmlsdGVyc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbERvY3RvcnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlRG9jdG9yRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycy97ZG9jdG9ySUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXREb2N0b3JCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycy97ZG9jdG9ySUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHVwZGF0ZURvY3RvckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMve2RvY3RvcklEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlRG9jdG9yRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycy9lbWFpbC97ZW1haWx9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXREb2N0b3JCeUVtYWlsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbFBheW1lbnRzRm9yUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlUGF0aWVudFBheW1lbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cy97cGF5bWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0UGF5bWVudEJ5SURGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cy97cGF5bWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCB1cGRhdGVQYXRpZW50UGF5bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzL3twYXltZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVQYXltZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF5bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGxpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvaW52b2ljZXMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbEludm9pY2VzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vc3VyZ2VyaWVzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SURGbik7XHJcbiAgICAgICAgLy8gL3BhdGllbnRzL3twYXRpZW50SUR9L3N1cmdlcmllcyBQT1NUIHJlbW92ZWQgd2l0aCBjcmVhdGVQYXRpZW50U3VyZ2VyeUZuIHN0dWIuXHJcbiAgICAgICAgcm91dGUoJy9zdXJnZXJpZXMve3N1cmdlcnlJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFN1cmdlcnlCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbERlcGFydG1lbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVOZXdEZXBhcnRtZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMvYnVsaycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVBbGxEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3NwZWNpYWxpemF0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsU3BlY2lhbGl6YXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlTmV3U3BlY2lhbGl6YXRpb25Gbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMvYnVsaycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZUFsbFNwZWNpYWxpemF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3N0YXRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGFkbWluUGFuZWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9hZG1pbi91c2Vycy97dXNlcm5hbWV9L2Rpc2FibGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9lbmFibGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9zZXQtcGFzc3dvcmQnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vYXVkaXQnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGFkbWluUGFuZWxGbik7XHJcblxyXG4gICAgICAgIC8vIFN0ZXAgNyDigJQgT3BlcmF0b3IgY29uc29sZTogc2luZ2xlIGNhdGNoLWFsbCByb3V0ZS4gV2UgZGVsaWJlcmF0ZWx5XHJcbiAgICAgICAgLy8gdXNlIHtwcm94eSt9ICsgQU5ZIG1ldGhvZCB0byBrZWVwIHRoZSByZXNvdXJjZSBjb3VudCBsb3cgKGVhY2hcclxuICAgICAgICAvLyBwYXRoIMOXIG1ldGhvZCA9IGEgQ0ZOIHJvdXRlIHJlc291cmNlOyB3ZSB3ZXJlIG5lYXIgdGhlIDUwMFxyXG4gICAgICAgIC8vIGNlaWxpbmcpLiBUaGUgTGFtYmRhIHBhcnNlcyB0aGUgcGF0aCBpdHNlbGYuIEFsbCByZXF1ZXN0cyBzdGlsbFxyXG4gICAgICAgIC8vIHBhc3MgdGhyb3VnaCB0aGUgSldUIGF1dGhvcml6ZXI7IHRoZSBMYW1iZGEgdGhlbiBjaGVja3NcclxuICAgICAgICAvLyBjbGFpbXMucm9sZSA9PT0gJ29wZXJhdG9yJy5cclxuICAgICAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgICAgICAgcGF0aDogJy9vcGVyYXRvci97cHJveHkrfScsXHJcbiAgICAgICAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuQU5ZXSxcclxuICAgICAgICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ09wZXJhdG9yQ29uc29sZVByb3h5Jywgb3BlcmF0b3JDb25zb2xlRm4pLFxyXG4gICAgICAgICAgICBhdXRob3JpemVyXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcm91dGUoJy9leGFtaW5hdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBleGFtaW5hdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9leGFtaW5hdGlvbnMve2V4YW1JZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zL3tleGFtSWR9L3NpZ25vZmYnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBleGFtaW5hdGlvbnNGbik7XHJcbiAgICAgICAgLy8gUGhhcm1hY3kgcm91dGVzIOKAlCBwYXRocyBtYXRjaCB0aGUgdGlyeWFxLXBoYXJtYWN5IExhbWJkYSdzIGludGVybmFsIHJvdXRlci5cclxuICAgICAgICAvLyAoTGFtYmRhIGRpc3BhdGNoZXMgb24gZXZlbnQucmF3UGF0aDsgQ0RLIG11c3QgcmVnaXN0ZXIgaWRlbnRpY2FsIHBhdGhzLilcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L21lZGljYXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9tZWRpY2F0aW9ucy97bWVkSWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvaW52ZW50b3J5JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9pbnZlbnRvcnkve21lZElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3ByZXNjcmlwdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3ByZXNjcmlwdGlvbnMve3J4SWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvZGlzcGVuc2UnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3B1cmNoYXNlLW9yZGVycycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvcHVyY2hhc2Utb3JkZXJzL3twb0lkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2FsZXJ0cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgLy8gRG9jdW1lbnQgbWFuYWdlciDigJQgcGF0aHMgbWF0Y2ggdGhlIHRpcnlhcS1kb2N1bWVudC1tYW5hZ2VyIExhbWJkYSdzXHJcbiAgICAgICAgLy8gaW50ZXJuYWwgcm91dGVyIGFuZCB0aGUgQW5ndWxhciBEb2N1bWVudFNlcnZpY2UgY2FsbHMuXHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvdXBsb2FkLXVybCcsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9kb3dubG9hZC11cmwnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvbGlzdCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL2ZvbGRlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9kZWxldGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2F1ZGl0JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYXVkaXRGbik7XHJcbiAgICAgICAgcm91dGUoJy9hcHBvaW50bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhcHBvaW50bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9hcHBvaW50bWVudHMve2FwcHRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYXBwb2ludG1lbnRzRm4pO1xyXG5cclxuICAgICAgICAvLyBIb3NwaXRhbCBjYWxlbmRhciByb3V0ZXMg4oCUIFRpcnlhcS1sb2NhbCwgSldULWF1dGhlbnRpY2F0ZWQuXHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGNhbGVuZGFyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvY2FsZW5kYXJzL3tjYWxlbmRhcklkfS9ldmVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0vZXZlbnRzL3tldmVudElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBjYWxlbmRhckZuKTtcclxuXHJcbiAgICAgICAgLy8gQmxvb2QgQmFuayBtb2R1bGVcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMve2Rvbm9ySWR9JywgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL2Rvbm9ycy97ZG9ub3JJZH0vZG9uYXRpb25zJywgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL2RvbmF0aW9ucycsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3VuaXRzJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3VuaXRzL3t1bml0SWR9JywgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvc3RvY2snLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMve3JlcXVlc3RJZH0nLCAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9yZXF1ZXN0cy97cmVxdWVzdElkfS9jcm9zc21hdGNoJywgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9yZXF1ZXN0cy97cmVxdWVzdElkfS9pc3N1ZScsICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuXHJcbiAgICAgICAgLy8gU2NyaWJlRmlyc3QgUGhhc2UgMSDigJQgU09BUCBzY3JpYmUgcm91dGVzXHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMve2lkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgc2NyaWJlRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zL3tpZH0vc29hcCcsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHNjcmliZUZuKTtcclxuICAgICAgICByb3V0ZSgnL3NjcmliZS9zZXNzaW9ucy97aWR9L2FwcHJvdmUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFMzICsgQ2xvdWRGcm9udFxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFGcm9udGVuZEJ1Y2tldCcsIHtcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFEYXRhS2V5LFxyXG4gICAgICAgICAgICBidWNrZXRLZXlFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGFjY2Vzc0xvZ3NCdWNrZXQsXHJcbiAgICAgICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NQcmVmaXg6ICdzMy1hY2Nlc3MvZnJvbnRlbmQvJyxcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ2V4cGlyZS1ub25jdXJyZW50LXZlcnNpb25zJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMTgwKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG9hYyA9IG5ldyBjbG91ZGZyb250LlMzT3JpZ2luQWNjZXNzQ29udHJvbCh0aGlzLCAnVGlyeWFxT0FDJywge1xyXG4gICAgICAgICAgICBzaWduaW5nOiBjbG91ZGZyb250LlNpZ25pbmcuU0lHVjRfTk9fT1ZFUlJJREVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdUaXJ5YXFEaXN0cmlidXRpb24nLCB7XHJcbiAgICAgICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgICAgICAgICAgb3JpZ2luOiBjbG91ZGZyb250T3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChzaXRlQnVja2V0LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luQWNjZXNzQ29udHJvbDogb2FjXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBWaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICAgICAgICAgIGNhY2hlUG9saWN5OiBDYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcclxuICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBBbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kuU0VDVVJJVFlfSEVBREVSU1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICBtaW5pbXVtUHJvdG9jb2xWZXJzaW9uOiBjbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAyMSxcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZSByZWdyZXNzaW9uOiBXQUYgdGVtcG9yYXJpbHkgZGlzYWJsZWQgdG8gc3RvcCBjaGFyZ2VzLlxyXG4gICAgICAgICAgICAvLyBSZS1lbmFibGUgYnkgc2V0dGluZyB3ZWJBY2xJZCBiYWNrIHRvIHByb3BzPy53ZWJBY2xBcm4gYW5kXHJcbiAgICAgICAgICAgIC8vIHJlLWluc3RhdGluZyB0aGUgVGlyeWFxRWRnZVN0YWNrIGluIGJpbi90aXJ5YXEtY2RrLnRzLlxyXG4gICAgICAgICAgICAvLyB3ZWJBY2xJZDogcHJvcHM/LndlYkFjbEFybixcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgYXVkaXQgdHJhaWwg4oCUIGxvZyBldmVyeSBDbG91ZEZyb250IHJlcXVlc3RcclxuICAgICAgICAgICAgLy8gKHZpZXdlciBJUCwgcmVxdWVzdCBVUkksIHJlc3BvbnNlIHN0YXR1cykuIFNlbnQgdG8gdGhlXHJcbiAgICAgICAgICAgIC8vIHNlcnZpY2UtbG9ncyBidWNrZXQgYmVjYXVzZSBDbG91ZEZyb250IGNhbm5vdCBkZWxpdmVyIHRvIGFuXHJcbiAgICAgICAgICAgIC8vIFNTRS1LTVMgZGVzdGluYXRpb24uXHJcbiAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXHJcbiAgICAgICAgICAgIGxvZ0J1Y2tldDogYWNjZXNzTG9nc0J1Y2tldCxcclxuICAgICAgICAgICAgbG9nRmlsZVByZWZpeDogJ2Nsb3VkZnJvbnQvJyxcclxuICAgICAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICAgICAgICAgIHsgaHR0cFN0YXR1czogNDAzLCByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCwgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBodHRwU3RhdHVzOiA0MDQsIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLCByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnIH1cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgY29tbWVudDogJ1RpcnlhcSBIb3NwaXRhbCBQbGF0Zm9ybSdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2l0ZUJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYCR7c2l0ZUJ1Y2tldC5idWNrZXRBcm59LypgXSxcclxuICAgICAgICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZnJvbnQuYW1hem9uYXdzLmNvbScpXSxcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ0FXUzpTb3VyY2VBcm4nOiBgYXJuOmF3czpjbG91ZGZyb250Ojoke2FjY291bnRJZH06ZGlzdHJpYnV0aW9uLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkfWBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRG9jdW1lbnRzIGJ1Y2tldCAob3duZWQgYnkgVEhJUyBhY2NvdW50KVxyXG4gICAgICAgIC8vIFRoZSBvbGQgYHRpcnlhcS1kb2N1bWVudHNgIG5hbWUgYmVsb25ncyB0byBhIGRpZmZlcmVudCBhY2NvdW50LCB3aGljaFxyXG4gICAgICAgIC8vIGlzIHdoeSBDT1JTIGNvdWxkIG5ldmVyIGJlIHNldC4gV2UgY3JlYXRlIG91ciBvd24gYWNjb3VudC1zY29wZWRcclxuICAgICAgICAvLyBidWNrZXQgYW5kIGRlY2xhcmUgQ09SUyBhcyBhIHByb3BlcnR5IHNvIGJyb3dzZXLihpJTMyBwcmUtc2lnbmVkIFBVVC9HRVRcclxuICAgICAgICAvLyB1cGxvYWRzIGFyZSBhbGxvd2VkLiBUaGUgTGFtYmRhIHJlYWRzIHRoZSBuYW1lIGZyb20gRE9DVU1FTlRTX0JVQ0tFVC5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBkb2N1bWVudHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFEb2N1bWVudHNCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtZG9jdW1lbnRzLSR7YWNjb3VudElkfS0ke3JlZ2lvbn1gLFxyXG4gICAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBjb3JzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULCBzMy5IdHRwTWV0aG9kcy5QVVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLkhFQURdLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAnQ29udGVudC1MZW5ndGgnLCAnQ29udGVudC1UeXBlJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4QWdlOiAzNjAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIGRvY3VtZW50TWFuYWdlckZuLmFkZEVudmlyb25tZW50KCdET0NVTUVOVFNfQlVDS0VUJywgZG9jdW1lbnRzQnVja2V0LmJ1Y2tldE5hbWUpO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBPdXRwdXRzXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHsgdmFsdWU6IGFwaS5hcGlFbmRwb2ludCwgZGVzY3JpcHRpb246ICdIVFRQIEFQSSBVUkwg4oaSIHVwZGF0ZSBDb25maWcudHMgdGlyeWFxVXJsJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVybCcsIHsgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCwgZGVzY3JpcHRpb246ICdGcm9udGVuZCBVUkwg4oaSIHVwZGF0ZSBjYWxsYmFja1VybHMgKyBsb2dvdXRVcmxzIHRoZW4gcmVkZXBsb3knIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7IHZhbHVlOiBzaXRlQnVja2V0LmJ1Y2tldE5hbWUsIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IOKGkiBuZyBidWlsZCArIGF3cyBzMyBzeW5jJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHsgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQg4oaSIHVwZGF0ZSBhcHAuY29uZmlnLnRzIGF1dGhvcml0eScgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcENsaWVudElkJywgeyB2YWx1ZTogYXBwQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBBcHAgQ2xpZW50IElEIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cyBjbGllbnRJZCcgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywgeyB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLCBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEIOKGkiBjYWNoZSBpbnZhbGlkYXRpb24nIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2duaXRvQXV0aG9yaXR5JywgeyB2YWx1ZTogYGh0dHBzOi8vY29nbml0by1pZHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHt1c2VyUG9vbC51c2VyUG9vbElkfWAsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBhdXRob3JpdHkgVVJMIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cycgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RvY3VtZW50c0J1Y2tldE5hbWUnLCB7IHZhbHVlOiBkb2N1bWVudHNCdWNrZXQuYnVja2V0TmFtZSwgZGVzY3JpcHRpb246ICdEb2N1bWVudHMgYnVja2V0ICh1cGxvYWRzIHZpYSBwcmUtc2lnbmVkIFVSTHMpJyB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=