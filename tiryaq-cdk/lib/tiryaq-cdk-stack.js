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
const events = __importStar(require("aws-cdk-lib/aws-events"));
const eventsTargets = __importStar(require("aws-cdk-lib/aws-events-targets"));
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
        ['Admin', 'Developers', 'Doctors', 'Pharmacists'].forEach((groupName) => {
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
        const createPatientSurgeryFn = fn('CreatePatientSurgery', 'createPatientSurgery', 'index.handler');
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
            createPatientSurgeryFn,
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
        // ─────────────────────────────────────────────────────────────────────
        // Lambda warmer — pings auth-critical and dashboard Lambdas every 5
        // minutes so first-user-of-the-day doesn't pay the cold-start tax.
        // Each ping costs $0 (the Lambda short-circuits on a `_warmup` event).
        // ─────────────────────────────────────────────────────────────────────
        // Warm only the auth-critical + dashboard Lambdas (max 5 per rule —
        // EventBridge limit — and keeping the count low because we're near
        // the CloudFormation 500-resource-per-stack ceiling). The rest of
        // the Lambdas can cold-start on their first user-driven call.
        const warmTargets = [
            preTokenFn, // every sign-in goes through this
            appointmentsFn, // dashboard + appointments page
            getAllPatientsFn, // dashboard + patients page
            getAllDoctorsFn, // dashboard + doctors page
            getAllInvoicesFn // dashboard + invoices page
        ].filter(Boolean);
        const warmerRule = new events.Rule(this, 'TiryaqLambdaWarmer', {
            description: 'Keeps auth + dashboard Lambdas warm to eliminate cold-start latency.',
            schedule: events.Schedule.rate(cdk.Duration.minutes(5))
        });
        warmTargets.forEach((target, i) => {
            warmerRule.addTarget(new eventsTargets.LambdaFunction(target, {
                event: events.RuleTargetInput.fromObject({ _warmup: true, idx: i })
            }));
        });
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
        route('/patients/{patientID}/surgeries', [apigwv2.HttpMethod.POST], createPatientSurgeryFn);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWNkay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpcnlhcS1jZGstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELHNFQUF3RDtBQUN4RCx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELDhFQUFnRTtBQU1oRSwrREFBK0Y7QUFDL0YsNkZBQWtGO0FBQ2xGLDJGQUE2RTtBQUc3RSxNQUFNLFdBQVcsR0FBRztJQUNoQixvQkFBb0I7SUFDcEIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1oseUJBQXlCO0lBQ3pCLFlBQVk7SUFDWixXQUFXO0lBQ1gsYUFBYTtJQUNiLFdBQVc7SUFDWCxXQUFXO0lBQ1gsZ0JBQWdCO0lBQ2hCLFlBQVk7SUFDWixhQUFhO0lBQ2IsZUFBZTtJQUNmLHlCQUF5QjtJQUN6QixTQUFTO0lBQ1QsVUFBVTtJQUNWLFlBQVk7SUFDWixhQUFhO0lBQ2Isa0JBQWtCO0lBQ2xCLGVBQWU7SUFDZixjQUFjO0lBQ2Qsb0JBQW9CO0lBQ3BCLFlBQVk7SUFDWixvQ0FBb0M7SUFDcEMsVUFBVTtJQUNWLFNBQVM7SUFDVCxnQkFBZ0I7Q0FDbkIsQ0FBQztBQUVGLE1BQU0sZUFBZSxHQUFHO0lBQ3BCLG1DQUFtQztJQUNuQyxZQUFZO0lBQ1osa0JBQWtCO0lBQ2xCLDBCQUEwQjtJQUMxQixZQUFZO0lBQ1osb0NBQW9DO0lBQ3BDLGNBQWM7SUFDZCxZQUFZO0lBQ1osb0JBQW9CO0lBQ3BCLG9CQUFvQjtJQUNwQixpQkFBaUI7SUFDakIsd0JBQXdCO0lBQ3hCLGNBQWM7SUFDZCxvQkFBb0I7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QUErRCxFQUFFLENBQUMsQ0FBQztRQUNwTCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxvQ0FBb0MsRUFBRSxDQUFDLENBQUM7UUFDN0gsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsdURBQXVELEVBQUUsQ0FBQyxDQUFDO1FBQzVJLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsdURBQXVELEVBQUUsQ0FBQyxDQUFDO1FBQ3BKLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLGNBQWMsRUFBRSxXQUFXLEVBQUUsaURBQWlELEVBQUUsQ0FBQyxDQUFDO1FBQ2xKLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLE1BQU0sa0JBQWtCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsOENBQThDLEVBQUUsQ0FBQyxDQUFDO1FBQzFMLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsZ0RBQWdELEVBQUUsQ0FBQyxDQUFDO0lBQ3pKLENBQUM7Q0FDSjtBQXZqQ0Qsa0NBdWpDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250T3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkdHJhaWwgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkdHJhaWwnO1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyBldmVudHNUYXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRpcnlhcVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgICAvKiogQVJOIG9mIHRoZSBDbG91ZEZyb250LXNjb3BlZCBXQUZ2MiBXZWJBQ0wgY3JlYXRlZCBpbiB0aGUgZWRnZSAodXMtZWFzdC0xKSBzdGFjay4gKi9cclxuICAgIHdlYkFjbEFybj86IHN0cmluZztcclxufVxyXG5pbXBvcnQgeyBWaWV3ZXJQcm90b2NvbFBvbGljeSwgQWxsb3dlZE1ldGhvZHMsIENhY2hlUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IEh0dHBKd3RBdXRob3JpemVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuY29uc3QgREVQQVJUTUVOVFMgPSBbXHJcbiAgICAnRW1lcmdlbmN5IE1lZGljaW5lJyxcclxuICAgICdJbnRlcm5hbCBNZWRpY2luZScsXHJcbiAgICAnR2VuZXJhbCBTdXJnZXJ5JyxcclxuICAgICdQZWRpYXRyaWNzJyxcclxuICAgICdPYnN0ZXRyaWNzICYgR3luZWNvbG9neScsXHJcbiAgICAnQ2FyZGlvbG9neScsXHJcbiAgICAnTmV1cm9sb2d5JyxcclxuICAgICdPcnRob3BlZGljcycsXHJcbiAgICAnUmFkaW9sb2d5JyxcclxuICAgICdQYXRob2xvZ3knLFxyXG4gICAgJ0FuZXN0aGVzaW9sb2d5JyxcclxuICAgICdQc3ljaGlhdHJ5JyxcclxuICAgICdEZXJtYXRvbG9neScsXHJcbiAgICAnT3BodGhhbG1vbG9neScsXHJcbiAgICAnRWFyIE5vc2UgJiBUaHJvYXQgKEVOVCknLFxyXG4gICAgJ1Vyb2xvZ3knLFxyXG4gICAgJ09uY29sb2d5JyxcclxuICAgICdOZXBocm9sb2d5JyxcclxuICAgICdQdWxtb25vbG9neScsXHJcbiAgICAnR2FzdHJvZW50ZXJvbG9neScsXHJcbiAgICAnRW5kb2NyaW5vbG9neScsXHJcbiAgICAnUmhldW1hdG9sb2d5JyxcclxuICAgICdJbmZlY3Rpb3VzIERpc2Vhc2UnLFxyXG4gICAgJ0hlbWF0b2xvZ3knLFxyXG4gICAgJ1BoeXNpY2FsIE1lZGljaW5lICYgUmVoYWJpbGl0YXRpb24nLFxyXG4gICAgJ1BoYXJtYWN5JyxcclxuICAgICdOdXJzaW5nJyxcclxuICAgICdBZG1pbmlzdHJhdGlvbidcclxuXTtcclxuXHJcbmNvbnN0IFNQRUNJQUxJWkFUSU9OUyA9IFtcclxuICAgICdHZW5lcmFsIChBZHVsdCkgSW50ZXJuYWwgTWVkaWNpbmUnLFxyXG4gICAgJ0NhcmRpb2xvZ3knLFxyXG4gICAgJ0dhc3Ryb2VudGVyb2xvZ3knLFxyXG4gICAgJ0VuZG9jcmlub2xvZ3kgJiBEaWFiZXRlcycsXHJcbiAgICAnTmVwaHJvbG9neScsXHJcbiAgICAnUHVsbW9ub2xvZ3kgJiBSZXNwaXJhdG9yeSBNZWRpY2luZScsXHJcbiAgICAnUmhldW1hdG9sb2d5JyxcclxuICAgICdIZW1hdG9sb2d5JyxcclxuICAgICdJbmZlY3Rpb3VzIERpc2Vhc2UnLFxyXG4gICAgJ0dlcmlhdHJpYyBNZWRpY2luZScsXHJcbiAgICAnR2VuZXJhbCBTdXJnZXJ5JyxcclxuICAgICdDYXJkaW90aG9yYWNpYyBTdXJnZXJ5JyxcclxuICAgICdOZXVyb3N1cmdlcnknLFxyXG4gICAgJ09ydGhvcGVkaWMgU3VyZ2VyeScsXHJcbiAgICAnUGxhc3RpYyAmIFJlY29uc3RydWN0aXZlIFN1cmdlcnknLFxyXG4gICAgJ1Zhc2N1bGFyIFN1cmdlcnknLFxyXG4gICAgJ1BlZGlhdHJpYyBTdXJnZXJ5JyxcclxuICAgICdVcm9sb2dpY2FsIFN1cmdlcnknLFxyXG4gICAgJ0VtZXJnZW5jeSBNZWRpY2luZScsXHJcbiAgICAnQ3JpdGljYWwgQ2FyZSBNZWRpY2luZScsXHJcbiAgICAnVHJhdW1hIFN1cmdlcnknLFxyXG4gICAgJ0dlbmVyYWwgUGVkaWF0cmljcycsXHJcbiAgICAnTmVvbmF0b2xvZ3knLFxyXG4gICAgJ1BlZGlhdHJpYyBDYXJkaW9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgTmV1cm9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgT25jb2xvZ3knLFxyXG4gICAgJ09ic3RldHJpY3MgJiBHeW5lY29sb2d5JyxcclxuICAgICdNYXRlcm5hbC1GZXRhbCBNZWRpY2luZScsXHJcbiAgICAnR3luZWNvbG9naWMgT25jb2xvZ3knLFxyXG4gICAgJ05ldXJvbG9neScsXHJcbiAgICAnUHN5Y2hpYXRyeScsXHJcbiAgICAnQ2xpbmljYWwgTmV1cm9waHlzaW9sb2d5JyxcclxuICAgICdSYWRpb2xvZ3kgJiBNZWRpY2FsIEltYWdpbmcnLFxyXG4gICAgJ051Y2xlYXIgTWVkaWNpbmUnLFxyXG4gICAgJ1BhdGhvbG9neSAmIExhYm9yYXRvcnkgTWVkaWNpbmUnLFxyXG4gICAgJ09waHRoYWxtb2xvZ3knLFxyXG4gICAgJ090b2xhcnluZ29sb2d5IChFTlQpJyxcclxuICAgICdEZXJtYXRvbG9neScsXHJcbiAgICAnU3BvcnRzIE1lZGljaW5lJyxcclxuICAgICdNZWRpY2FsIE9uY29sb2d5JyxcclxuICAgICdSYWRpYXRpb24gT25jb2xvZ3knLFxyXG4gICAgJ0FuZXN0aGVzaW9sb2d5JyxcclxuICAgICdQYWluIE1lZGljaW5lJyxcclxuICAgICdQYWxsaWF0aXZlIENhcmUnLFxyXG4gICAgJ0ZhbWlseSBNZWRpY2luZScsXHJcbiAgICAnT2NjdXBhdGlvbmFsIE1lZGljaW5lJyxcclxuICAgICdQdWJsaWMgSGVhbHRoJ1xyXG5dO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRpcnlhcVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogVGlyeWFxU3RhY2tQcm9wcykge1xyXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgICAgICBjb25zdCBhY2NvdW50SWQgPSBjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudDtcclxuICAgICAgICBjb25zdCByZWdpb24gPSBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkg4oCUIGVuY3J5cHRpb24gYXQgcmVzdCB3aXRoIGN1c3RvbWVyIGNvbnRyb2wuXHJcbiAgICAgICAgLy8gVHdvIENNS3M6XHJcbiAgICAgICAgLy8gICAtIHRpcnlhcURhdGFLZXkgIOKGkiBlbmNyeXB0cyBEeW5hbW9EQiBhbmQgdGhlIGZyb250ZW5kIFMzIGJ1Y2tldFxyXG4gICAgICAgIC8vICAgLSB0aXJ5YXFBdWRpdEtleSDihpIgZW5jcnlwdHMgdGhlIGF1ZGl0IGxvZyBidWNrZXQgKHNlcGFyYXRlZCBzb1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBsYW5lIGtleSBjb21wcm9taXNlIGRvZXMgbm90IGludmFsaWRhdGVcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgdGhlIGF1ZGl0IGNoYWluKVxyXG4gICAgICAgIC8vIEFubnVhbCBhdXRvbWF0aWMgcm90YXRpb247IGtleSBhZG1pbnMgbGltaXRlZCB0byB0aGUgZGVwbG95aW5nXHJcbiAgICAgICAgLy8gcHJpbmNpcGFsOyB1c2FnZSBsaW1pdGVkIHRvIHNwZWNpZmljIEFXUyBzZXJ2aWNlcyBpbiB0aGlzIGFjY291bnQuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdGlyeWFxRGF0YUtleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdUaXJ5YXFEYXRhS2V5Jywge1xyXG4gICAgICAgICAgICBhbGlhczogJ2FsaWFzL3RpcnlhcS9kYXRhJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDTUsgZm9yIFRpcnlhcSBEeW5hbW9EQiBhbmQgZnJvbnRlbmQgYnVja2V0IOKAlCBQRFBQTCBBcnQuIDkuJyxcclxuICAgICAgICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgcGVuZGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHRpcnlhcUF1ZGl0S2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1RpcnlhcUF1ZGl0S2V5Jywge1xyXG4gICAgICAgICAgICBhbGlhczogJ2FsaWFzL3RpcnlhcS9hdWRpdCcsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ01LIGZvciBUaXJ5YXEgYXVkaXQgbG9nIGJ1Y2tldCBhbmQgQ2xvdWRUcmFpbCDigJQgc2VncmVnYXRlZCBmcm9tIGRhdGEga2V5LicsXHJcbiAgICAgICAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBlbmRpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5kYXlzKDMwKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDbG91ZFRyYWlsICh0aGUgQVdTIHNlcnZpY2UpIG5lZWRzIHBlcm1pc3Npb24gdG8gdXNlIHRoZSBhdWRpdCBDTUtcclxuICAgICAgICAvLyB3aGVuIGl0IHdyaXRlcyBlbmNyeXB0ZWQgbG9nIGZpbGVzIGludG8gdGhlIGF1ZGl0IGJ1Y2tldC5cclxuICAgICAgICB0aXJ5YXFBdWRpdEtleS5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBzaWQ6ICdBbGxvd0Nsb3VkVHJhaWxFbmNyeXB0TG9ncycsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2ttczpHZW5lcmF0ZURhdGFLZXkqJywgJ2ttczpEZXNjcmliZUtleSddLFxyXG4gICAgICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWR0cmFpbC5hbWF6b25hd3MuY29tJyldLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHsgJ2F3czpTb3VyY2VBY2NvdW50JzogY2RrLkF3cy5BQ0NPVU5UX0lEIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBzZXBhcmF0ZSBcInNlcnZpY2UgYWNjZXNzIGxvZ3NcIiBidWNrZXQuXHJcbiAgICAgICAgLy8gUzMgc2VydmVyIGFjY2VzcyBsb2dnaW5nIGFuZCBDbG91ZEZyb250IHN0YW5kYXJkIGxvZ2dpbmcgYm90aFxyXG4gICAgICAgIC8vIHJlZnVzZSBTU0UtS01TIGRlc3RpbmF0aW9uIGJ1Y2tldHMsIHNvIHdlIGtlZXAgdGhlc2UgQVdTLXNlcnZpY2VcclxuICAgICAgICAvLyBsb2dzIGluIGEgZGVkaWNhdGVkIGJ1Y2tldCB3aXRoIFNTRS1TMyArIHZlcnNpb25pbmcgKyBsaWZlY3ljbGUuXHJcbiAgICAgICAgLy8gVGhlIGhpZ2gtYXNzdXJhbmNlIChDTUsgKyBPYmplY3QgTG9jaykgYnVja2V0IGJlbG93IGhvbGRzXHJcbiAgICAgICAgLy8gQ2xvdWRUcmFpbCBhbmQgZXhwb3J0ZWQgYXBwbGljYXRpb24gYXVkaXQgb25seS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhY2Nlc3NMb2dzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxQWNjZXNzTG9nc0J1Y2tldCcsIHtcclxuICAgICAgICAgICAgYnVja2V0TmFtZTogYHRpcnlhcS1hY2Nlc3MtbG9ncy0ke2FjY291bnRJZH0tJHtyZWdpb259YCxcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG9iamVjdE93bmVyc2hpcDogczMuT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9QUkVGRVJSRUQsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ3RyYW5zaXRpb24tYW5kLWV4cGlyZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLCB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApIH1cclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDI1NTUpIC8vIDcgeWVhcnNcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkgKyBNT1BIIGF1ZGl0IHRyYWlsLlxyXG4gICAgICAgIC8vIEltbXV0YWJsZSBhdWRpdCBsb2cgYnVja2V0IOKAlCBPYmplY3QgTG9jayBpbiBjb21wbGlhbmNlIG1vZGUgcHJldmVudHNcclxuICAgICAgICAvLyB0YW1wZXJpbmcgb3IgZGVsZXRpb24gb2YgYXVkaXQgcmVjb3JkcywgZXZlbiBieSBhY2NvdW50IGFkbWlucy5cclxuICAgICAgICAvLyA3LXllYXIgcmV0ZW50aW9uIGFsaWducyB3aXRoIFFhdGFyIGhlYWx0aGNhcmUgcmVjb3JkLWtlZXBpbmcgbm9ybXMuXHJcbiAgICAgICAgLy8gVmVyc2lvbmluZyBpcyBtYW5kYXRvcnkgZm9yIE9iamVjdCBMb2NrLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGF1ZGl0QnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxQXVkaXRCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtYXVkaXQtJHthY2NvdW50SWR9LSR7cmVnaW9ufWAsXHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFBdWRpdEtleSxcclxuICAgICAgICAgICAgYnVja2V0S2V5RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICAgICAgICBvYmplY3RMb2NrRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgb2JqZWN0TG9ja0RlZmF1bHRSZXRlbnRpb246IHMzLk9iamVjdExvY2tSZXRlbnRpb24uY29tcGxpYW5jZShjZGsuRHVyYXRpb24uZGF5cygyNTU1KSksIC8vIDcgeWVhcnNcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndHJhbnNpdGlvbi10by1nbGFjaWVyJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUiwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCkgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgbm9uY3VycmVudFZlcnNpb25UcmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkRFRVBfQVJDSElWRSwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygxODApIH1cclxuICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgKyBOQ1NBIE5JQSDigJQgaW5mcmFzdHJ1Y3R1cmUtbGV2ZWwgYXVkaXQuXHJcbiAgICAgICAgLy8gTXVsdGktcmVnaW9uIHRyYWlsIHdpdGggbG9nIGZpbGUgdmFsaWRhdGlvbi4gQ2FwdHVyZXMgZXZlcnkgQVdTIEFQSVxyXG4gICAgICAgIC8vIGNhbGwgKGNvbnRyb2wgcGxhbmUpLiBTZW50IHRvIHRoZSBpbW11dGFibGUgYXVkaXQgYnVja2V0IGFib3ZlLlxyXG4gICAgICAgIC8vIFMzIGRhdGEgZXZlbnRzIGNhcHR1cmVkIGZvciB0aGUgZnJvbnRlbmQgYnVja2V0IHNvIHdlIGNhbiBwcm92ZVxyXG4gICAgICAgIC8vIHdobyBkb3dubG9hZGVkIHdoYXQgKFBISSBhY2Nlc3MgcGF0aCB0aHJvdWdoIHByZS1zaWduZWQgVVJMcykuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdHJhaWwgPSBuZXcgY2xvdWR0cmFpbC5UcmFpbCh0aGlzLCAnVGlyeWFxQ2xvdWRUcmFpbCcsIHtcclxuICAgICAgICAgICAgdHJhaWxOYW1lOiAndGlyeWFxLWNsb3VkdHJhaWwnLFxyXG4gICAgICAgICAgICBidWNrZXQ6IGF1ZGl0QnVja2V0LFxyXG4gICAgICAgICAgICBzM0tleVByZWZpeDogJ2Nsb3VkdHJhaWwnLFxyXG4gICAgICAgICAgICBpc011bHRpUmVnaW9uVHJhaWw6IHRydWUsXHJcbiAgICAgICAgICAgIGluY2x1ZGVHbG9iYWxTZXJ2aWNlRXZlbnRzOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmFibGVGaWxlVmFsaWRhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgc2VuZFRvQ2xvdWRXYXRjaExvZ3M6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hMb2dzUmV0ZW50aW9uOiBjZGsuYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfWUVBUixcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxQXVkaXRLZXlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRHluYW1vREJcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIElNUE9SVEFOVCDigJQgR1NJIERFUExPWU1FTlQgUlVMRTpcclxuICAgICAgICAvLyBEeW5hbW9EQiBvbmx5IGFsbG93cyBPTkUgR1NJIHRvIGJlIGNyZWF0ZWQgcGVyIHRhYmxlIHVwZGF0ZS5cclxuICAgICAgICAvLyBUaGlzIG1lYW5zIG9uIGEgRlJFU0ggZGVwbG95IChuZXcgYWNjb3VudCksIGFsbCA3IEdTSXMgd2lsbCBiZVxyXG4gICAgICAgIC8vIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5IGJlY2F1c2UgQ0RLIGNyZWF0ZXMgdGhlIHRhYmxlICsgYWxsIEdTSXNcclxuICAgICAgICAvLyBpbiB0aGUgaW5pdGlhbCBDUkVBVEUgb3BlcmF0aW9uIChub3QgYW4gVVBEQVRFKS5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIEhvd2V2ZXIgaWYgeW91IGFkZCBhIE5FVyBHU0kgdG8gYW4gZXhpc3RpbmcgdGFibGUgdmlhIGNkayBkZXBsb3ksXHJcbiAgICAgICAgLy8geW91IE1VU1QgYWRkIG9ubHkgb25lIGF0IGEgdGltZSDigJQgb3RoZXJ3aXNlIENsb3VkRm9ybWF0aW9uIHdpbGxcclxuICAgICAgICAvLyBmYWlsIHdpdGggXCJDYW5ub3QgcGVyZm9ybSBtb3JlIHRoYW4gb25lIEdTSSBjcmVhdGlvbiBvciBkZWxldGlvblxyXG4gICAgICAgIC8vIGluIGEgc2luZ2xlIHVwZGF0ZVwiLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gQ3VycmVudCBHU0lzIChhbGwgY3JlYXRlZCBvbiBmcmVzaCBkZXBsb3kpOlxyXG4gICAgICAgIC8vICAgMS4gRW50aXR5VHlwZS1pbmRleCAgICAgICAgICDigJQgbWFpbiBxdWVyeSBpbmRleFxyXG4gICAgICAgIC8vICAgMi4gUGF0aWVudElELWluZGV4ICAgICAgICAgICDigJQgcGF0aWVudC1yZWxhdGVkIHF1ZXJpZXNcclxuICAgICAgICAvLyAgIDMuIGVtYWlsLWluZGV4ICAgICAgICAgICAgICAg4oCUIGxvb2t1cCBieSBlbWFpbFxyXG4gICAgICAgIC8vICAgNC4gZG9jdG9yRW1haWwtY3JlYXRlZEF0LWluZGV4IOKAlCBkb2N0b3IgZW1haWwgKyBkYXRlIHF1ZXJpZXNcclxuICAgICAgICAvLyAgIDUuIEdTSTEgICAgICAgICAgICAgICAgICAgICAg4oCUIGdlbmVyaWMgR1NJIChHU0kxUEsgKyBHU0kxU0spXHJcbiAgICAgICAgLy8gICA2LiBHU0kyICAgICAgICAgICAgICAgICAgICAgIOKAlCBuYW1lIHNlYXJjaCAobmFtZV9wcmVmaXggKyBuYW1lX2xvd2VyKVxyXG4gICAgICAgIC8vICAgNy4gZGF0YUNsYXNzLWluZGV4ICAgICAgICAgICDigJQgUERQUEwgYnJlYWNoIHNjb3BpbmcgKFVwZGF0ZSAwNilcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIENvbXBsaWFuY2Ug4oCUIGV2ZXJ5IGl0ZW0gd3JpdHRlbiB0byB0aGlzIHRhYmxlIFNIT1VMRCBpbmNsdWRlIGFcclxuICAgICAgICAvLyBgZGF0YUNsYXNzYCBhdHRyaWJ1dGUgZHJhd24gZnJvbSB7IFBISSwgUElJLCBQVUJMSUMsIEFVRElULCBTWVNURU0gfVxyXG4gICAgICAgIC8vIGFuZCBhbiBPUFRJT05BTCBgZXhwaXJlc0F0YCAoZXBvY2ggc2Vjb25kcykgYXR0cmlidXRlIHRoYXQgRHluYW1vREJcclxuICAgICAgICAvLyBUVEwgd2lsbCB1c2UgdG8gYXV0by1wdXJnZSB0cmFuc2llbnQgcmVjb3Jkcy5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnSG9zcGl0YWxUYWJsZScsIHtcclxuICAgICAgICAgICAgdGFibGVOYW1lOiAnSG9zcGl0YWwnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7IHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFEYXRhS2V5LFxyXG4gICAgICAgICAgICBkZWxldGlvblByb3RlY3Rpb246IHRydWUsXHJcbiAgICAgICAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICdleHBpcmVzQXQnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnRW50aXR5VHlwZS1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRW50aXR5VHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdQYXRpZW50SUQtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3BhdGllbnRJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ2VtYWlsLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdlbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZG9jdG9yRW1haWwtY3JlYXRlZEF0LWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkb2N0b3JFbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdHU0kxJyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdHU0kxUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdHU0kxU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnR1NJMicsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbmFtZV9wcmVmaXgnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICduYW1lX2xvd2VyJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBicmVhY2ggc2NvcGluZyArIE5DU0EgTklBIGRhdGEgY2xhc3NpZmljYXRpb24uXHJcbiAgICAgICAgLy8gTGV0cyB1cyBhbnN3ZXIgXCJzaG93IG1lIGV2ZXJ5IFBISSByZWNvcmQgdG91Y2hlZCBiZXR3ZWVuIHQxIGFuZCB0MlwiXHJcbiAgICAgICAgLy8gd2l0aG91dCBhIGZ1bGwgdGFibGUgc2NhbiBkdXJpbmcgYSBmb3JlbnNpYyBpbnZlc3RpZ2F0aW9uLlxyXG4gICAgICAgIC8vIFNvcnQga2V5ID0gdXBkYXRlZEF0IHNvIHdlIGdldCBpdGVtcyBpbiBjaHJvbm9sb2dpY2FsIG9yZGVyLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZGF0YUNsYXNzLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkYXRhQ2xhc3MnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1cGRhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuS0VZU19PTkxZXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFN0ZXAgMiDigJQgTXVsdGktdGVuYW50IGZvdW5kYXRpb24uXHJcbiAgICAgICAgLy8gUG9vbGVkIG11bHRpLXRlbmFuY3kgKEF0aGVuYWhlYWx0aCAvIFBhcnRpY2xlIEhlYWx0aCBtb2RlbCk6XHJcbiAgICAgICAgLy8gZXZlcnkgcm93IGNhcnJpZXMgYHRlbmFudElkYC4gVGhpcyBHU0kgbGV0cyBlYWNoIGN1c3RvbWVyIGxpc3RcclxuICAgICAgICAvLyB0aGVpciBvd24gcm93cyBieSBFbnRpdHlUeXBlIGluIE8oMSkg4oCUIG5vIGZ1bGwtdGFibGUgc2NhbnMsIG5vXHJcbiAgICAgICAgLy8gY3Jvc3MtdGVuYW50IGxlYWsgcmlzay4gU29ydCBrZXkgPSBFbnRpdHlUeXBlIHNvIGEgdGVuYW50IGNhblxyXG4gICAgICAgIC8vIHJlcXVlc3QgXCJhbGwgUEFUSUVOVCByb3dzIGZvciB0ZW5hbnQgVF9hMWIyYzNkNFwiIGluIG9uZSBRdWVyeS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ3RlbmFudC1lbnRpdHlUeXBlLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd0ZW5hbnRJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFN0ZXAgNCDigJQgSGFzaGVkLXNlYXJjaCBsb29rdXAgaW5kZXguXHJcbiAgICAgICAgLy8gQWZ0ZXIgU3RlcCAzIGVuY3J5cHRlZCBgZW1haWxgLCBgcWlkYCwgYHBob25lYCwgdGhlIGV4aXN0aW5nXHJcbiAgICAgICAgLy8gZW1haWwtaW5kZXggcmV0dXJucyBjaXBoZXJ0ZXh0IHRoYXQgdmFyaWVzIHBlciByb3csIHNvIGVxdWFsaXR5XHJcbiAgICAgICAgLy8gbG9va3VwcyBieSBlbWFpbCBubyBsb25nZXIgd29yay4gV2Ugc3RvcmUgYW4gSE1BQy1TSEEyNTYgaGFzaFxyXG4gICAgICAgIC8vIChgZW1haWxIYXNoYCkgYWxvbmdzaWRlIHRoZSBjaXBoZXJ0ZXh0IGFuZCBRdWVyeSB0aGlzIGluZGV4IHRvXHJcbiAgICAgICAgLy8gZmluZCBhIHJlY29yZCBieSBpdHMgcGxhaW50ZXh0IGVtYWlsIGFmdGVyIGhhc2hpbmcgdGhlIGlucHV0XHJcbiAgICAgICAgLy8gd2l0aCB0aGUgdGVuYW50J3MgS01TIEhNQUMga2V5LlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZW1haWxIYXNoLUVudGl0eVR5cGUtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsSGFzaCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvZ25pdG8gVXNlciBQb29sXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5ICsgTU9QSCBhY2Nlc3MtY29udHJvbCBleHBlY3RhdGlvbnMuXHJcbiAgICAgICAgLy8gLSBQYXNzd29yZCBwb2xpY3kgYWxpZ25lZCB3aXRoIE5DU0EgTklBOiAxMiBjaGFycyBtaW4sIGFsbCBjbGFzc2VzLlxyXG4gICAgICAgIC8vIC0gVGVtcG9yYXJ5IHBhc3N3b3JkIHZhbGlkaXR5IHJlZHVjZWQgdG8gMyBkYXlzIChmb3JjZSByb3RhdGlvbikuXHJcbiAgICAgICAgLy8gLSBNRkEgUkVRVUlSRUQgZm9yIGV2ZXJ5IHVzZXI7IFRPVFAgcHJlZmVycmVkLCBTTVMgZmFsbGJhY2suXHJcbiAgICAgICAgLy8gLSBBZHZhbmNlZCBTZWN1cml0eSBhdWRpdHMgKENvZ25pdG8gdGhyZWF0IHByb3RlY3Rpb24pIGVuZm9yY2VkLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1RpcnlhcVVzZXJQb29sJywge1xyXG4gICAgICAgICAgICB1c2VyUG9vbE5hbWU6ICd0aXJ5YXEtdXNlci1wb29sJyxcclxuICAgICAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBzaWduSW5BbGlhc2VzOiB7IHVzZXJuYW1lOiB0cnVlLCBlbWFpbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgZW1haWw6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIGZ1bGxuYW1lOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBnZW5kZXI6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHBob25lTnVtYmVyOiB7IHJlcXVpcmVkOiBmYWxzZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgYmlydGhkYXRlOiB7IHJlcXVpcmVkOiBmYWxzZSwgbXV0YWJsZTogdHJ1ZSB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgICAgICAvLyBTdGVwIDIg4oCUIE11bHRpLXRlbmFudCBmb3VuZGF0aW9uLlxyXG4gICAgICAgICAgICAvLyBgY3VzdG9tOnRlbmFudElkYCBpcyB0aGUgb3BhcXVlIElEIChlLmcuIFRfYTFiMmMzZDQpIHRoYXRcclxuICAgICAgICAgICAgLy8gdGllcyBhIHVzZXIgdG8gb25lIGhvc3BpdGFsIGN1c3RvbWVyLiBJbmplY3RlZCBpbnRvIHRoZSBKV1RcclxuICAgICAgICAgICAgLy8gYnkgdGhlIHByZS10b2tlbi1nZW5lcmF0aW9uIExhbWJkYSBhbmQgcmVhZCBieSBldmVyeSBiYWNrZW5kXHJcbiAgICAgICAgICAgIC8vIExhbWJkYSB0byBzY29wZSBEeW5hbW9EQiBxdWVyaWVzLiBNdXRhYmxlPXRydWUgc28gdGhlXHJcbiAgICAgICAgICAgIC8vIG9wZXJhdG9yIGNvbnNvbGUgY2FuIHJlLWFzc2lnbiBhIHVzZXIgKHJhcmUsIGJ1dCBwb3NzaWJsZVxyXG4gICAgICAgICAgICAvLyBmb3IgY3Jvc3MtaG9zcGl0YWwgdHJhbnNmZXJzKS5cclxuICAgICAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgIHRlbmFudElkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlLCBtaW5MZW46IDEsIG1heExlbjogNjQgfSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICAgICAgICAgIG1pbkxlbmd0aDogMTIsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBDb21wbGlhbmNlIHJlZ3Jlc3Npb246IE1GQSBmdWxseSBkaXNhYmxlZCAoUkVRVUlSRUQgLT4gT1BUSU9OQUxcclxuICAgICAgICAgICAgLy8gLT4gT0ZGKSBieSByZXF1ZXN0LiBUaGUgdHdvLXN0ZXAgcGF0aCB3YXMgbmVlZGVkIGJlY2F1c2VcclxuICAgICAgICAgICAgLy8gQ29nbml0byByZWZ1c2VzIFJFUVVJUkVEIC0+IE9GRiBkaXJlY3RseSBvbiBhIGxpdmUgcG9vbC5cclxuICAgICAgICAgICAgLy8gUmUtZW5hYmxlIGJ5IHJlc3RvcmluZyBNZmEuUkVRVUlSRUQgYW5kIHJlLWRlcGxveWluZy5cclxuICAgICAgICAgICAgbWZhOiBjb2duaXRvLk1mYS5PRkYsXHJcbiAgICAgICAgICAgIC8vIG1mYVNlY29uZEZhY3RvciBub3QgbmVlZGVkIHdoZW4gbWZhIGlzIE9GRi5cclxuICAgICAgICAgICAgLy8gbWZhU2Vjb25kRmFjdG9yOiB7IHNtczogdHJ1ZSwgb3RwOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuICAgICAgICAgICAgc3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZTogY29nbml0by5TdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlLkZVTExfRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGRldmljZVRyYWNraW5nOiB7XHJcbiAgICAgICAgICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFwcENsaWVudCA9IHVzZXJQb29sLmFkZENsaWVudCgnVGlyeWFxQXBwQ2xpZW50Jywge1xyXG4gICAgICAgICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdUaXJ5YXEnLFxyXG4gICAgICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgICAgICAgIGF1dGhGbG93czoge1xyXG4gICAgICAgICAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXNlclNycDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGN1c3RvbTogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvQXV0aDoge1xyXG4gICAgICAgICAgICAgICAgZmxvd3M6IHsgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgc2NvcGVzOiBbY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCwgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLCBjb2duaXRvLk9BdXRoU2NvcGUuUEhPTkUsIGNvZ25pdG8uT0F1dGhTY29wZS5QUk9GSUxFXSxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrVXJsczogWydodHRwOi8vbG9jYWxob3N0OjQyMDAvJywgJ2h0dHBzOi8vZDZpN2l3a25rajBiZy5jbG91ZGZyb250Lm5ldC8nXSxcclxuICAgICAgICAgICAgICAgIGxvZ291dFVybHM6IFsnaHR0cDovL2xvY2FsaG9zdDo0MjAwLycsICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQvJ11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICBpZFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdXNlclBvb2wuYWRkRG9tYWluKCdUaXJ5YXFEb21haW4nLCB7XHJcbiAgICAgICAgICAgIGNvZ25pdG9Eb21haW46IHsgZG9tYWluUHJlZml4OiAndGlyeWFxLWhvc3BpdGFsJyB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIFsnQWRtaW4nLCAnRGV2ZWxvcGVycycsICdEb2N0b3JzJywgJ1BoYXJtYWNpc3RzJ10uZm9yRWFjaCgoZ3JvdXBOYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgYEdyb3VwJHtncm91cE5hbWV9YCwge1xyXG4gICAgICAgICAgICAgICAgdXNlclBvb2xJZDogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgIGdyb3VwTmFtZSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHtncm91cE5hbWV9IGdyb3VwYFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gUHJlIFRva2VuIEdlbmVyYXRpb24gTGFtYmRhXHJcbiAgICAgICAgLy8gSW5qZWN0cyBlbWFpbCArIG5hbWUgZnJvbSBDb2duaXRvIHVzZXIgYXR0cmlidXRlcyBpbnRvIHRoZVxyXG4gICAgICAgIC8vIEFjY2VzcyBUb2tlbiBjbGFpbXMgc28gYWxsIExhbWJkYSBmdW5jdGlvbnMgY2FuIGlkZW50aWZ5IHRoZSBhY3Rvci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBwcmVUb2tlbkZuID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ29nbml0b1ByZVRva2VuR2VuZXJhdGlvbicsIHtcclxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAnY29nbml0by1wcmUtdG9rZW4tZ2VuZXJhdGlvbicsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2NvZ25pdG8tcHJlLXRva2VuLWdlbmVyYXRpb24nKSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHByZVRva2VuRm4uYWRkUGVybWlzc2lvbignQ29nbml0b0ludm9rZScsIHtcclxuICAgICAgICAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2NvZ25pdG8taWRwLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICAgICAgc291cmNlQXJuOiB1c2VyUG9vbC51c2VyUG9vbEFyblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBjZm5Vc2VyUG9vbCA9IHVzZXJQb29sLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNvZ25pdG8uQ2ZuVXNlclBvb2w7XHJcbiAgICAgICAgY2ZuVXNlclBvb2wubGFtYmRhQ29uZmlnID0ge1xyXG4gICAgICAgICAgICBwcmVUb2tlbkdlbmVyYXRpb25Db25maWc6IHtcclxuICAgICAgICAgICAgICAgIGxhbWJkYUFybjogcHJlVG9rZW5Gbi5mdW5jdGlvbkFybixcclxuICAgICAgICAgICAgICAgIGxhbWJkYVZlcnNpb246ICdWM18wJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU3RlcCAzIOKAlCBQZXItdGVuYW50IEtNUyBrZXlzIGZvciBQSEkgZW52ZWxvcGUgZW5jcnlwdGlvbi5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIEtleXMgYXJlIGNyZWF0ZWQgT1VUU0lERSBDREsgKHZpYSBBV1MgQ29uc29sZSAvIENMSSkgc28gdGhleSBzdXJ2aXZlXHJcbiAgICAgICAgLy8gc3RhY2sgcmVidWlsZHMgYW5kIGRvbid0IGNvdW50IGFnYWluc3QgdGhlIDUwMC1yZXNvdXJjZSBjZWlsaW5nLlxyXG4gICAgICAgIC8vIFRoZSBrZXkgcG9saWNpZXMgd2hpdGVsaXN0IGFueSByb2xlIG1hdGNoaW5nXHJcbiAgICAgICAgLy8gYFRpcnlhcUNka1N0YWNrLSpTZXJ2aWNlUm9sZSpgIOKAlCB0aGF0J3MgZXZlcnkgTGFtYmRhIGV4ZWN1dGlvbiByb2xlXHJcbiAgICAgICAgLy8gaW4gdGhpcyBzdGFjaywgYXV0b21hdGljYWxseS4gTm8gSUFNIGdyYW50IGZyb20gQ0RLIGlzIG5lZWRlZC5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIFRvIG9uYm9hcmQgYSBuZXcgdGVuYW50OiBjcmVhdGUgYSBDTUsgaW4gdXMtZWFzdC0xIHdpdGggYWxpYXNcclxuICAgICAgICAvLyBgYWt3YWRvbmEtdGVuYW50LTxzbHVnPmAsIGFwcGx5IHRoZSBzdGFuZGFyZCBrZXkgcG9saWN5IHRlbXBsYXRlLFxyXG4gICAgICAgIC8vIHRoZW4gYWRkIGl0cyB0ZW5hbnRJZCDihpIgQVJOIGVudHJ5IGJlbG93IGFuZCByZWRlcGxveS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0ZW5hbnRLZXlzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICAnVF8yNTcyZmM3MSc6ICdhcm46YXdzOmttczp1cy1lYXN0LTE6NDgzMTc2NjM0NjY1OmtleS8xMWIxMzg2Yi01MWMyLTQxYWItYjViYS1hYTZlYjlhMGU4YTYnLCAvLyBUaXJ5YXFcclxuICAgICAgICAgICAgJ1RfYTRiOGFlZjknOiAnYXJuOmF3czprbXM6dXMtZWFzdC0xOjQ4MzE3NjYzNDY2NTprZXkvYzFjMTY1N2ItYjNmOS00MWE5LWE4MTYtZGVlMzgyZTAwYmIxJyAgLy8gQWxzaGlmYWFcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTdGVwIDQg4oCUIFBlci10ZW5hbnQgS01TIEhNQUMga2V5cyBmb3Igc2VhcmNoYWJsZSBoYXNoZWQgZmllbGRzLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gUEhJIGZpZWxkcyBsaWtlIGBxaWRgLCBgZW1haWxgLCBgcGhvbmVgIGFyZSBub3cgZW5jcnlwdGVkIChTdGVwIDMpLFxyXG4gICAgICAgIC8vIHNvIGVxdWFsaXR5IGxvb2t1cHMgKGZpbmQgcGF0aWVudCBieSBRSUQpIG5vIGxvbmdlciB3b3JrIOKAlCBldmVyeVxyXG4gICAgICAgIC8vIGVuY3J5cHRpb24gdXNlcyBhIGZyZXNoIElWLCBzbyB0aGUgc2FtZSBwbGFpbnRleHQgcHJvZHVjZXMgZGlmZmVyZW50XHJcbiAgICAgICAgLy8gY2lwaGVydGV4dCBlYWNoIHRpbWUuIFRvIHJlc3RvcmUgc2VhcmNoIHdlIHN0b3JlIGFuIEhNQUMtU0hBMjU2XHJcbiAgICAgICAgLy8gaGFzaCBhbG9uZ3NpZGUgdGhlIGNpcGhlcnRleHQ6IGRldGVybWluaXN0aWMgcGVyICh0ZW5hbnQsIHBsYWludGV4dCksXHJcbiAgICAgICAgLy8gb25lLXdheSAoY2FuJ3QgcmV2ZXJzZSksIHRlbmFudC1zY29wZWQgKGRpZmZlcmVudCB0ZW5hbnRzIHByb2R1Y2VcclxuICAgICAgICAvLyBkaWZmZXJlbnQgaGFzaGVzIGZvciB0aGUgc2FtZSBpbnB1dCkuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBLTVMgSE1BQyBrZXlzIGtlZXAgdGhlIHNlY3JldCBpbnNpZGUgdGhlIEZJUFMgMTQwLTIgSFNNIOKAlCB0aGVcclxuICAgICAgICAvLyBoYXNoaW5nIGNhbGwgZ29lcyB0byBLTVMsIHRoZSBMYW1iZGEgbmV2ZXIgc2VlcyB0aGUgc2VjcmV0LlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHRlbmFudEhtYWNLZXlzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICAnVF8yNTcyZmM3MSc6ICdhcm46YXdzOmttczp1cy1lYXN0LTE6NDgzMTc2NjM0NjY1OmtleS82MDFmOGFhYi1mMzdjLTQ3ODYtYTU1Ny1hZmMxMmNiODY0ZTgnLCAvLyBUaXJ5YXEgSE1BQ1xyXG4gICAgICAgICAgICAnVF9hNGI4YWVmOSc6ICdhcm46YXdzOmttczp1cy1lYXN0LTE6NDgzMTc2NjM0NjY1OmtleS8wYTIzZWEzMy00NjU5LTRmMzctYTRhMi1hNjIzNjYwMTBiY2QnICAvLyBBbHNoaWZhYSBITUFDXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU2hhcmVkIExhbWJkYSBlbnZpcm9ubWVudCArIGhlbHBlclxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNoYXJlZEVudiA9IHtcclxuICAgICAgICAgICAgVEFCTEVfTkFNRTogJ0hvc3BpdGFsJyxcclxuICAgICAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAvLyBKU09OIG1hcDogdGVuYW50SWQg4oaSIEtNUyBrZXkgQVJOLiBUaGUgY3J5cHRvIGhlbHBlciBpbiBlYWNoXHJcbiAgICAgICAgICAgIC8vIExhbWJkYSBwYXJzZXMgdGhpcyBvbmNlIGFuZCB1c2VzIGl0IHRvIGVuY3J5cHQvZGVjcnlwdCBQSEkuXHJcbiAgICAgICAgICAgIFRFTkFOVF9LRVlTOiBKU09OLnN0cmluZ2lmeSh0ZW5hbnRLZXlzKSxcclxuICAgICAgICAgICAgLy8gU3RlcCA0IOKAlCBKU09OIG1hcDogdGVuYW50SWQg4oaSIEtNUyBITUFDIGtleSBBUk4uIFVzZWQgYnkgdGhlXHJcbiAgICAgICAgICAgIC8vIGNyeXB0byBoZWxwZXIncyBjb21wdXRlSG1hYygpIHRvIHByb2R1Y2Ugc2VhcmNoYWJsZSBoYXNoZXMgb2ZcclxuICAgICAgICAgICAgLy8gUEhJIGZpZWxkcy4gTmV2ZXIgc2VlcyB0aGUga2V5IG1hdGVyaWFsIOKAlCBLTVMgcnVucyB0aGUgTUFDLlxyXG4gICAgICAgICAgICBURU5BTlRfSE1BQ19LRVlTOiBKU09OLnN0cmluZ2lmeSh0ZW5hbnRIbWFjS2V5cylcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBMYW1iZGEgZmFjdG9yeS5cclxuICAgICAgICAvLyBNZW1vcnkgYnVtcGVkIHRvIDUxMiBNQiBieSBkZWZhdWx0IOKAlCBOb2RlLmpzIGNvbGQtc3RhcnQgc2NhbGVzIHdpdGhcclxuICAgICAgICAvLyBDUFUgd2hpY2ggaXMgYWxsb2NhdGVkIHByb3BvcnRpb25hbGx5IHRvIG1lbW9yeTsgNTEyIE1CIHJvdWdobHlcclxuICAgICAgICAvLyBoYWx2ZXMgY29sZC1zdGFydCB0aW1lIHZzIHRoZSBkZWZhdWx0IDEyOCBNQiBhbmQgaXMgc3RpbGwgcGVubmllcy9tb250aC5cclxuICAgICAgICBjb25zdCBmbiA9IChpZDogc3RyaW5nLCBmb2xkZXI6IHN0cmluZywgaGFuZGxlcjogc3RyaW5nLCBydW50aW1lOiBsYW1iZGEuUnVudGltZSA9IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLCBleHRyYUVudjogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9LCBvcHRzOiB7IG1lbW9yeVNpemU/OiBudW1iZXIgfSA9IHt9KSA9PlxyXG4gICAgICAgICAgICBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGlkLCB7XHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbk5hbWU6IGZvbGRlcixcclxuICAgICAgICAgICAgICAgIHJ1bnRpbWUsXHJcbiAgICAgICAgICAgICAgICBoYW5kbGVyLFxyXG4gICAgICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KGBsYW1iZGEvJHtmb2xkZXJ9YCksXHJcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDogeyAuLi5zaGFyZWRFbnYsIC4uLmV4dHJhRW52IH0sXHJcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgICAgICAgICAgICBtZW1vcnlTaXplOiBvcHRzLm1lbW9yeVNpemUgPz8gNTEyXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgZ2V0QWxsUGF0aWVudHNGbiA9IGZuKCdHZXRBbGxQYXRpZW50cycsICdnZXRBbGxQYXRpZW50cycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0UGF0aWVudEJ5SURGbiA9IGZuKCdHZXRQYXRpZW50QnlJRCcsICdnZXRQYXRpZW50QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlUGF0aWVudEZuID0gZm4oJ0NyZWF0ZVBhdGllbnQnLCAnY3JlYXRlUGF0aWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgdXBkYXRlUGF0aWVudEZuID0gZm4oJ1VwZGF0ZVBhdGllbnQnLCAndXBkYXRlUGF0aWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlUGF0aWVudEZuID0gZm4oJ0RlbGV0ZVBhdGllbnQnLCAnZGVsZXRlUGF0aWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzRm4gPSBmbignR2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzJywgJ2dldFBhdGllbnRzRGF0YUJ5RmlsdGVycycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsRG9jdG9yc0ZuID0gZm4oJ0dldEFsbERvY3RvcnMnLCAnZ2V0QWxsRG9jdG9ycycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0RG9jdG9yQnlJREZuID0gZm4oJ0dldERvY3RvckJ5SUQnLCAnZ2V0RG9jdG9yQnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0RG9jdG9yQnlFbWFpbEZuID0gZm4oJ0dldERvY3RvckJ5RW1haWwnLCAnZ2V0RG9jdG9yQnlFbWFpbCcsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZURvY3RvckZuID0gZm4oJ0NyZWF0ZURvY3RvcicsICdjcmVhdGVEb2N0b3InLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZURvY3RvckZuID0gZm4oJ1VwZGF0ZURvY3RvcicsICd1cGRhdGVEb2N0b3InLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZURvY3RvckZuID0gZm4oJ0RlbGV0ZURvY3RvcicsICdkZWxldGVEb2N0b3InLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZVBhdGllbnRQYXltZW50Rm4gPSBmbignQ3JlYXRlUGF0aWVudFBheW1lbnQnLCAnY3JlYXRlUGF0aWVudFBheW1lbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbFBheW1lbnRzRm9yUGF0aWVudEZuID0gZm4oJ0dldEFsbFBheW1lbnRzRm9yUGF0aWVudCcsICdnZXRBbGxQYXltZW50c0ZvclBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGxpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlERm4gPSBmbignTGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SUQnLCAnbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZVBhdGllbnRQYXltZW50Rm4gPSBmbignVXBkYXRlUGF0aWVudFBheW1lbnQnLCAndXBkYXRlUGF0aWVudFBheW1lbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFBheW1lbnRCeUlERm4gPSBmbignR2V0UGF5bWVudEJ5SUQnLCAnZ2V0UGF5bWVudEJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZVBheW1lbnRGbiA9IGZuKCdEZWxldGVQYXltZW50JywgJ2RlbGV0ZVBheW1lbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbEludm9pY2VzRm4gPSBmbignR2V0QWxsSW52b2ljZXMnLCAnZ2V0QWxsSW52b2ljZXMnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVQYXRpZW50U3VyZ2VyeUZuID0gZm4oJ0NyZWF0ZVBhdGllbnRTdXJnZXJ5JywgJ2NyZWF0ZVBhdGllbnRTdXJnZXJ5JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SURGbiA9IGZuKCdMaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SUQnLCAnbGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRTdXJnZXJ5QnlJREZuID0gZm4oJ0dldFN1cmdlcnlCeUlEJywgJ2dldFN1cmdlcnlCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxEZXBhcnRtZW50c0ZuID0gZm4oJ0dldEFsbERlcGFydG1lbnRzJywgJ2dldEFsbERlcGFydG1lbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVOZXdEZXBhcnRtZW50Rm4gPSBmbignQ3JlYXRlTmV3RGVwYXJ0bWVudCcsICdjcmVhdGVOZXdEZXBhcnRtZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBidWxrQ3JlYXRlRGVwYXJ0bWVudHNGbiA9IGZuKCdCdWxrQ3JlYXRlRGVwYXJ0bWVudHMnLCAnYnVsa0NyZWF0ZURlcGFydG1lbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVBbGxEZXBhcnRtZW50c0ZuID0gZm4oJ0RlbGV0ZUFsbERlcGFydG1lbnRzJywgJ2RlbGV0ZUFsbERlcGFydG1lbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxTcGVjaWFsaXphdGlvbnNGbiA9IGZuKCdHZXRBbGxTcGVjaWFsaXphdGlvbnMnLCAnZ2V0QWxsU3BlY2lhbGl6YXRpb25zJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVOZXdTcGVjaWFsaXphdGlvbkZuID0gZm4oJ0NyZWF0ZU5ld1NwZWNpYWxpemF0aW9uJywgJ2NyZWF0ZU5ld1NwZWNpYWxpemF0aW9uJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zRm4gPSBmbignQnVsa0NyZWF0ZVNwZWNpYWxpemF0aW9ucycsICdidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVBbGxTcGVjaWFsaXphdGlvbnNGbiA9IGZuKCdEZWxldGVBbGxTcGVjaWFsaXphdGlvbnMnLCAnZGVsZXRlQWxsU3BlY2lhbGl6YXRpb25zJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBhZG1pblBhbmVsRm4gPSBmbignVGlyeWFxQWRtaW5QYW5lbCcsICd0aXJ5YXEtYWRtaW4tcGFuZWwnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YKTtcclxuICAgICAgICBjb25zdCBleGFtaW5hdGlvbnNGbiA9IGZuKCdUaXJ5YXFFeGFtaW5hdGlvbnMnLCAndGlyeWFxLWV4YW1pbmF0aW9ucycsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IHBoYXJtYWN5Rm4gPSBmbignVGlyeWFxUGhhcm1hY3knLCAndGlyeWFxLXBoYXJtYWN5JywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgZG9jdW1lbnRNYW5hZ2VyRm4gPSBmbignVGlyeWFxRG9jdW1lbnRNYW5hZ2VyJywgJ3RpcnlhcS1kb2N1bWVudC1tYW5hZ2VyJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgYXVkaXRGbiA9IGZuKCdUaXJ5YXFBdWRpdCcsICd0aXJ5YXEtYXVkaXQnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBhcHBvaW50bWVudHNGbiA9IGZuKCdUaXJ5YXFBcHBvaW50bWVudHMnLCAndGlyeWFxLWFwcG9pbnRtZW50cycsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIC8vIEhvc3BpdGFsIGNhbGVuZGFyIOKAlCByZXBsYWNlcyB0aGUgcHJldmlvdXMgZXh0ZXJuYWwgQ2FsZW5kYXJQbGF0Zm9ybSBTYWFTLlxyXG4gICAgICAgIC8vIEFsbCBjYWxlbmRhciBkYXRhIG5vdyBwZXJzaXN0cyBpbiB0aGUgSG9zcGl0YWwgRHluYW1vREIgdGFibGUgZm9yXHJcbiAgICAgICAgLy8gUERQUEwgZGF0YS1yZXNpZGVuY3kgKyBjbGluaWNhbC1wcml2YWN5IGNvbXBsaWFuY2UuXHJcbiAgICAgICAgY29uc3QgY2FsZW5kYXJGbiA9IGZuKCdUaXJ5YXFDYWxlbmRhcicsICd0aXJ5YXEtY2FsZW5kYXInLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YKTtcclxuICAgICAgICAvLyBCbG9vZCBCYW5rIG1vZHVsZSDigJQgZG9ub3JzIC8gZG9uYXRpb25zIC8gaW52ZW50b3J5IC8gcmVxdWVzdHMgLyBjcm9zc21hdGNoIC8gaXNzdWUuXHJcbiAgICAgICAgY29uc3QgYmxvb2RiYW5rRm4gPSBmbignVGlyeWFxQmxvb2RiYW5rJywgJ3RpcnlhcS1ibG9vZGJhbmsnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU2NyaWJlRmlyc3QgUGhhc2UgMSDigJQgU09BUCBnZW5lcmF0aW9uIExhbWJkYS5cclxuICAgICAgICAvLyBDYWxscyBCZWRyb2NrIGZvciB0cmFuc2NyaXB0IOKGkiBTT0FQIHNwbGl0OyB3cml0ZXMgc2Vzc2lvbiArIGF1ZGl0XHJcbiAgICAgICAgLy8gcm93cyB0byB0aGUgZXhpc3Rpbmcgc2luZ2xlLXRhYmxlLlxyXG4gICAgICAgIC8vIEJFRFJPQ0tfUkVHSU9OIGNhbiBkaWZmZXIgZnJvbSBBV1NfUkVHSU9OIHdoZW4gQmVkcm9jayBpc24ndCB5ZXRcclxuICAgICAgICAvLyBhdmFpbGFibGUgaW4gdGhlIGRhdGEtcGxhbmUgcmVnaW9uIChlLmcuIG1lLXNvdXRoLTEgcHJvZHVjdGlvbikuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3Qgc2NyaWJlRm4gPSBmbihcclxuICAgICAgICAgICAgJ1RpcnlhcVNjcmliZScsXHJcbiAgICAgICAgICAgICd0aXJ5YXEtc2NyaWJlJyxcclxuICAgICAgICAgICAgJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgQkVEUk9DS19SRUdJT046ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgICAgICAgICAgLy8gQ2xhdWRlIDMuNSBIYWlrdSB2aWEgdGhlIFVTIGNyb3NzLXJlZ2lvbiBpbmZlcmVuY2UgcHJvZmlsZS5cclxuICAgICAgICAgICAgICAgIC8vIFRoZSBvcmlnaW5hbCBjbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNyBtb2RlbCB3YXMgcmV0aXJlZC9tYXJrZWRcclxuICAgICAgICAgICAgICAgIC8vIGxlZ2FjeSBieSB0aGUgcHJvdmlkZXIsIHdoaWNoIGNhdXNlZCBJbnZva2VNb2RlbCBBY2Nlc3NEZW5pZWQuXHJcbiAgICAgICAgICAgICAgICAvLyBOZXdlciBBbnRocm9waWMgbW9kZWxzIG9uIEJlZHJvY2sgYXJlIG9ubHkgaW52b2thYmxlIHRocm91Z2ggYW5cclxuICAgICAgICAgICAgICAgIC8vIGluZmVyZW5jZSBwcm9maWxlICh0aGUgXCJ1cy5cIiBwcmVmaXgpLCBub3QgdGhlIGJhcmUgbW9kZWwgSUQuXHJcbiAgICAgICAgICAgICAgICBCRURST0NLX01PREVMX0lEOiAndXMuYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgLy8gQWxsb3cgQmVkcm9jayBJbnZva2VNb2RlbCBvbiB0aGUgQ2xhdWRlIDMuNSBIYWlrdSBVUyBpbmZlcmVuY2UgcHJvZmlsZS5cclxuICAgICAgICAvLyBBIGNyb3NzLXJlZ2lvbiBpbmZlcmVuY2UgcHJvZmlsZSByZXF1aXJlcyBwZXJtaXNzaW9uIG9uIEJPVEggdGhlXHJcbiAgICAgICAgLy8gcHJvZmlsZSBBUk4gYW5kIHRoZSB1bmRlcmx5aW5nIGZvdW5kYXRpb24tbW9kZWwgQVJOcyBpbiBldmVyeSByZWdpb25cclxuICAgICAgICAvLyB0aGUgcHJvZmlsZSBjYW4gcm91dGUgdG8gKHVzLWVhc3QtMSAvIHVzLWVhc3QtMiAvIHVzLXdlc3QtMikuXHJcbiAgICAgICAgc2NyaWJlRm4uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIGBhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOiR7dGhpcy5hY2NvdW50fTppbmZlcmVuY2UtcHJvZmlsZS91cy5hbnRocm9waWMuY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMS12MTowYCxcclxuICAgICAgICAgICAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMS12MTowJyxcclxuICAgICAgICAgICAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMS12MTowJyxcclxuICAgICAgICAgICAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLXdlc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMS12MTowJ1xyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIER5bmFtb0RCIHBlcm1pc3Npb25zXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgYWxsRnVuY3Rpb25zID0gW1xyXG4gICAgICAgICAgICBnZXRBbGxQYXRpZW50c0ZuLFxyXG4gICAgICAgICAgICBnZXRQYXRpZW50QnlJREZuLFxyXG4gICAgICAgICAgICBjcmVhdGVQYXRpZW50Rm4sXHJcbiAgICAgICAgICAgIHVwZGF0ZVBhdGllbnRGbixcclxuICAgICAgICAgICAgZGVsZXRlUGF0aWVudEZuLFxyXG4gICAgICAgICAgICBnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnNGbixcclxuICAgICAgICAgICAgZ2V0QWxsRG9jdG9yc0ZuLFxyXG4gICAgICAgICAgICBnZXREb2N0b3JCeUlERm4sXHJcbiAgICAgICAgICAgIGdldERvY3RvckJ5RW1haWxGbixcclxuICAgICAgICAgICAgY3JlYXRlRG9jdG9yRm4sXHJcbiAgICAgICAgICAgIHVwZGF0ZURvY3RvckZuLFxyXG4gICAgICAgICAgICBkZWxldGVEb2N0b3JGbixcclxuICAgICAgICAgICAgY3JlYXRlUGF0aWVudFBheW1lbnRGbixcclxuICAgICAgICAgICAgZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50Rm4sXHJcbiAgICAgICAgICAgIGxpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlERm4sXHJcbiAgICAgICAgICAgIHVwZGF0ZVBhdGllbnRQYXltZW50Rm4sXHJcbiAgICAgICAgICAgIGdldFBheW1lbnRCeUlERm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZVBheW1lbnRGbixcclxuICAgICAgICAgICAgZ2V0QWxsSW52b2ljZXNGbixcclxuICAgICAgICAgICAgY3JlYXRlUGF0aWVudFN1cmdlcnlGbixcclxuICAgICAgICAgICAgbGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlERm4sXHJcbiAgICAgICAgICAgIGdldFN1cmdlcnlCeUlERm4sXHJcbiAgICAgICAgICAgIGdldEFsbERlcGFydG1lbnRzRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZU5ld0RlcGFydG1lbnRGbixcclxuICAgICAgICAgICAgYnVsa0NyZWF0ZURlcGFydG1lbnRzRm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZUFsbERlcGFydG1lbnRzRm4sXHJcbiAgICAgICAgICAgIGdldEFsbFNwZWNpYWxpemF0aW9uc0ZuLFxyXG4gICAgICAgICAgICBjcmVhdGVOZXdTcGVjaWFsaXphdGlvbkZuLFxyXG4gICAgICAgICAgICBidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zRm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZUFsbFNwZWNpYWxpemF0aW9uc0ZuLFxyXG4gICAgICAgICAgICBhZG1pblBhbmVsRm4sXHJcbiAgICAgICAgICAgIGV4YW1pbmF0aW9uc0ZuLFxyXG4gICAgICAgICAgICBwaGFybWFjeUZuLFxyXG4gICAgICAgICAgICBkb2N1bWVudE1hbmFnZXJGbixcclxuICAgICAgICAgICAgYXVkaXRGbixcclxuICAgICAgICAgICAgYXBwb2ludG1lbnRzRm4sXHJcbiAgICAgICAgICAgIGNhbGVuZGFyRm4sXHJcbiAgICAgICAgICAgIGJsb29kYmFua0ZuLFxyXG4gICAgICAgICAgICBzY3JpYmVGblxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGFsbEZ1bmN0aW9ucy5mb3JFYWNoKChmKSA9PiB7XHJcbiAgICAgICAgICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmKTtcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZTogTGFtYmRhIGV4ZWN1dGlvbiByb2xlcyBtdXN0IGJlIGV4cGxpY2l0bHkgZ3JhbnRlZFxyXG4gICAgICAgICAgICAvLyBLTVMgRW5jcnlwdC9EZWNyeXB0IG9uIHRoZSBkYXRhIENNSyBiZWNhdXNlIER5bmFtb0RCIENVU1RPTUVSX01BTkFHRURcclxuICAgICAgICAgICAgLy8gZW5jcnlwdGlvbiByZXF1aXJlcyB0aGUgY2FsbGVyIHByaW5jaXBhbCB0byBoYXZlIGtleSBhY2Nlc3MuXHJcbiAgICAgICAgICAgIHRpcnlhcURhdGFLZXkuZ3JhbnRFbmNyeXB0RGVjcnlwdChmKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gTGFtYmRhIHdhcm1lciDigJQgcGluZ3MgYXV0aC1jcml0aWNhbCBhbmQgZGFzaGJvYXJkIExhbWJkYXMgZXZlcnkgNVxyXG4gICAgICAgIC8vIG1pbnV0ZXMgc28gZmlyc3QtdXNlci1vZi10aGUtZGF5IGRvZXNuJ3QgcGF5IHRoZSBjb2xkLXN0YXJ0IHRheC5cclxuICAgICAgICAvLyBFYWNoIHBpbmcgY29zdHMgJDAgKHRoZSBMYW1iZGEgc2hvcnQtY2lyY3VpdHMgb24gYSBgX3dhcm11cGAgZXZlbnQpLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFdhcm0gb25seSB0aGUgYXV0aC1jcml0aWNhbCArIGRhc2hib2FyZCBMYW1iZGFzIChtYXggNSBwZXIgcnVsZSDigJRcclxuICAgICAgICAvLyBFdmVudEJyaWRnZSBsaW1pdCDigJQgYW5kIGtlZXBpbmcgdGhlIGNvdW50IGxvdyBiZWNhdXNlIHdlJ3JlIG5lYXJcclxuICAgICAgICAvLyB0aGUgQ2xvdWRGb3JtYXRpb24gNTAwLXJlc291cmNlLXBlci1zdGFjayBjZWlsaW5nKS4gVGhlIHJlc3Qgb2ZcclxuICAgICAgICAvLyB0aGUgTGFtYmRhcyBjYW4gY29sZC1zdGFydCBvbiB0aGVpciBmaXJzdCB1c2VyLWRyaXZlbiBjYWxsLlxyXG4gICAgICAgIGNvbnN0IHdhcm1UYXJnZXRzID0gW1xyXG4gICAgICAgICAgICBwcmVUb2tlbkZuLCAgICAgICAgIC8vIGV2ZXJ5IHNpZ24taW4gZ29lcyB0aHJvdWdoIHRoaXNcclxuICAgICAgICAgICAgYXBwb2ludG1lbnRzRm4sICAgIC8vIGRhc2hib2FyZCArIGFwcG9pbnRtZW50cyBwYWdlXHJcbiAgICAgICAgICAgIGdldEFsbFBhdGllbnRzRm4sICAvLyBkYXNoYm9hcmQgKyBwYXRpZW50cyBwYWdlXHJcbiAgICAgICAgICAgIGdldEFsbERvY3RvcnNGbiwgICAvLyBkYXNoYm9hcmQgKyBkb2N0b3JzIHBhZ2VcclxuICAgICAgICAgICAgZ2V0QWxsSW52b2ljZXNGbiAgIC8vIGRhc2hib2FyZCArIGludm9pY2VzIHBhZ2VcclxuICAgICAgICBdLmZpbHRlcihCb29sZWFuKSBhcyBsYW1iZGEuRnVuY3Rpb25bXTtcclxuXHJcbiAgICAgICAgY29uc3Qgd2FybWVyUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnVGlyeWFxTGFtYmRhV2FybWVyJywge1xyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0tlZXBzIGF1dGggKyBkYXNoYm9hcmQgTGFtYmRhcyB3YXJtIHRvIGVsaW1pbmF0ZSBjb2xkLXN0YXJ0IGxhdGVuY3kuJyxcclxuICAgICAgICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5yYXRlKGNkay5EdXJhdGlvbi5taW51dGVzKDUpKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHdhcm1UYXJnZXRzLmZvckVhY2goKHRhcmdldCwgaSkgPT4ge1xyXG4gICAgICAgICAgICB3YXJtZXJSdWxlLmFkZFRhcmdldChuZXcgZXZlbnRzVGFyZ2V0cy5MYW1iZGFGdW5jdGlvbih0YXJnZXQsIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50OiBldmVudHMuUnVsZVRhcmdldElucHV0LmZyb21PYmplY3QoeyBfd2FybXVwOiB0cnVlLCBpZHg6IGkgfSlcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTZWVkIExhbWJkYSBhbHNvIHdyaXRlcyB0byB0aGUgZW5jcnlwdGVkIHRhYmxlLlxyXG4gICAgICAgIC8vIChncmFudGVkIGZ1cnRoZXIgZG93biB3aGVyZSBzZWVkRm4gaXMgZGVmaW5lZC4pXHJcblxyXG4gICAgICAgIGFkbWluUGFuZWxGbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnY29nbml0by1pZHA6TGlzdFVzZXJzJywgJ2NvZ25pdG8taWRwOkxpc3RVc2Vyc0luR3JvdXAnLCAnY29nbml0by1pZHA6QWRtaW5EaXNhYmxlVXNlcicsICdjb2duaXRvLWlkcDpBZG1pbkVuYWJsZVVzZXInLCAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIERvY3VtZW50cyBidWNrZXQgYWNjZXNzIGlzIGdyYW50ZWQgb24gdGhlIGJ1Y2tldCBjb25zdHJ1Y3QgYmVsb3dcclxuICAgICAgICAvLyAoc2VlIFRpcnlhcURvY3VtZW50c0J1Y2tldCksIHNvIG5vIGNyb3NzLWFjY291bnQgaW5saW5lIHBvbGljeSBoZXJlLlxyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTZWVkIExhbWJkYSDigJQgZGVwYXJ0bWVudHMsIHNwZWNpYWxpemF0aW9ucywgY291bnRlcnNcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzZWVkRm4gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUaXJ5YXFTZWVkRnVuY3Rpb24nLCB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ3RpcnlhcS1zZWVkJyxcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7IFRBQkxFX05BTUU6ICdIb3NwaXRhbCcgfSxcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXHJcbmNvbnN0IHsgRHluYW1vREJDbGllbnQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicpO1xyXG5jb25zdCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicpO1xyXG5jb25zdCB7IHJhbmRvbVVVSUQgfSA9IHJlcXVpcmUoJ2NyeXB0bycpO1xyXG5jb25zdCBjbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20obmV3IER5bmFtb0RCQ2xpZW50KHt9KSk7XHJcbmNvbnN0IFRBQkxFICA9IHByb2Nlc3MuZW52LlRBQkxFX05BTUU7XHJcbmNvbnN0IERFUEFSVE1FTlRTID0gJHtKU09OLnN0cmluZ2lmeShERVBBUlRNRU5UUyl9O1xyXG5jb25zdCBTUEVDSUFMSVpBVElPTlMgPSAke0pTT04uc3RyaW5naWZ5KFNQRUNJQUxJWkFUSU9OUyl9O1xyXG5cclxuLy8gYXR0cmlidXRlX25vdF9leGlzdHMoUEspIG1ha2VzIGV2ZXJ5IFB1dCBpZGVtcG90ZW50IOKAlCBleGlzdGluZyByb3dzIGFyZVxyXG4vLyBwcmVzZXJ2ZWQuIFRoaXMgcHJvdGVjdHMgdGhlIHBhdGllbnQvZG9jdG9yIGNvdW50ZXJzIGZyb20gYmVpbmcgcmVzZXQgb25cclxuLy8gYW55IGZ1dHVyZSByZXBsYXkgb2YgdGhpcyBDdXN0b21SZXNvdXJjZS5cclxuYXN5bmMgZnVuY3Rpb24gcHV0SWZBYnNlbnQoaXRlbSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBjbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgICAgICAgIFRhYmxlTmFtZTogVEFCTEUsXHJcbiAgICAgICAgICAgIEl0ZW06IGl0ZW0sXHJcbiAgICAgICAgICAgIENvbmRpdGlvbkV4cHJlc3Npb246ICdhdHRyaWJ1dGVfbm90X2V4aXN0cyhQSyknXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGlmIChlLm5hbWUgPT09ICdDb25kaXRpb25hbENoZWNrRmFpbGVkRXhjZXB0aW9uJykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHRocm93IGU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xyXG4gICAgLy8gUmVxdWVzdFR5cGUgaGFuZGxpbmc6XHJcbiAgICAvLyAgIENyZWF0ZSDihpIgcnVuIHRoZSBmdWxsIHNlZWQuXHJcbiAgICAvLyAgIFVwZGF0ZSDihpIgTk8tT1AuIFJlZmVyZW5jZSBkYXRhIChkZXBhcnRtZW50cywgc3BlY2lhbGl6YXRpb25zKSBhbmRcclxuICAgIC8vICAgICAgICAgICAgbGl2ZSBjb3VudGVycyBtdXN0IG5vdCBiZSByZWdlbmVyYXRlZCBhdXRvbWF0aWNhbGx5LiBUb1xyXG4gICAgLy8gICAgICAgICAgICByZS1zZWVkIGludGVudGlvbmFsbHksIHJlcGxhY2UgdGhpcyBDdXN0b21SZXNvdXJjZSB2aWFcclxuICAgIC8vICAgICAgICAgICAgY29uc29sZSBvciBidW1wIHRoZSBsb2dpY2FsIGlkLlxyXG4gICAgLy8gICBEZWxldGUg4oaSIE5PLU9QLiBOZXZlciBkZXN0cm95IHNlZWRlZCByZWZlcmVuY2UgZGF0YSBvbiBzdGFjayBkZWxldGUuXHJcbiAgICBpZiAoZXZlbnQuUmVxdWVzdFR5cGUgIT09ICdDcmVhdGUnKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAnc2VlZCcsIERhdGE6IHsgc2tpcHBlZDogZXZlbnQuUmVxdWVzdFR5cGUgfSB9O1xyXG4gICAgfVxyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgbGV0IHdyaXR0ZW4gPSAwO1xyXG4gICAgaWYgKGF3YWl0IHB1dElmQWJzZW50KHsgUEs6ICdDT1VOVEVSI1BBVElFTlRTJywgU0s6ICdDT1VOVEVSJywgY291bnQ6IDAsIEVudGl0eVR5cGU6ICdDT1VOVEVSJyB9KSkgd3JpdHRlbisrO1xyXG4gICAgaWYgKGF3YWl0IHB1dElmQWJzZW50KHsgUEs6ICdDT1VOVEVSI0RPQ1RPUlMnLCAgU0s6ICdDT1VOVEVSJywgY291bnQ6IDAsIEVudGl0eVR5cGU6ICdDT1VOVEVSJyB9KSkgd3JpdHRlbisrO1xyXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIERFUEFSVE1FTlRTKSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSByYW5kb21VVUlEKCk7XHJcbiAgICAgICAgaWYgKGF3YWl0IHB1dElmQWJzZW50KHsgUEs6IFxcYERFUEFSVE1FTlQjXFwke2lkfVxcYCwgU0s6ICdQUk9GSUxFJywgRW50aXR5VHlwZTogJ0RFUEFSVE1FTlQnLCBkZXBhcnRtZW50SWQ6IGlkLCBuYW1lLCBjcmVhdGVkQXQ6IG5vdyB9KSkgd3JpdHRlbisrO1xyXG4gICAgfVxyXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIFNQRUNJQUxJWkFUSU9OUykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gcmFuZG9tVVVJRCgpO1xyXG4gICAgICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiBcXGBTUEVDSUFMSVpBVElPTiNcXCR7aWR9XFxgLCBTSzogJ1BST0ZJTEUnLCBFbnRpdHlUeXBlOiAnU1BFQ0lBTElaQVRJT04nLCBzcGVjaWFsaXphdGlvbklkOiBpZCwgbmFtZSwgY3JlYXRlZEF0OiBub3cgfSkpIHdyaXR0ZW4rKztcclxuICAgIH1cclxuICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3NlZWQnLCBEYXRhOiB7IHdyaXR0ZW4gfSB9O1xyXG59O1xyXG4gICAgICAgICAgICBgKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5ncmFudFdyaXRlRGF0YShzZWVkRm4pO1xyXG4gICAgICAgIHRpcnlhcURhdGFLZXkuZ3JhbnRFbmNyeXB0RGVjcnlwdChzZWVkRm4pO1xyXG4gICAgICAgIGNvbnN0IHNlZWRQcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcih0aGlzLCAnU2VlZFByb3ZpZGVyJywgeyBvbkV2ZW50SGFuZGxlcjogc2VlZEZuIH0pO1xyXG4gICAgICAgIC8vIFN0YWJsZSBwcm9wZXJ0eSDigJQgc2FtZSBvbiBldmVyeSBzeW50aCDigJQgc28gQ2xvdWRGb3JtYXRpb24gZG9lcyBOT1RcclxuICAgICAgICAvLyByZS10cmlnZ2VyIGFuIFVwZGF0ZSBvZiB0aGUgU2VlZERhdGEgQ3VzdG9tUmVzb3VyY2Ugb24gYGNkayBkZXBsb3lgLlxyXG4gICAgICAgIC8vIFByZXZpb3VzbHkgYHRpbWVzdGFtcDogRGF0ZS5ub3coKWAgY2F1c2VkIHRoZSBzZWVkIExhbWJkYSB0byBydW4gb25cclxuICAgICAgICAvLyBldmVyeSBkZXBsb3ksIHJlc2V0dGluZyBwYXRpZW50L2RvY3RvciBjb3VudGVycyBhbmQgZHVwbGljYXRpbmdcclxuICAgICAgICAvLyBkZXBhcnRtZW50L3NwZWNpYWxpemF0aW9uIHJlY29yZHMuXHJcbiAgICAgICAgbmV3IGNkay5DdXN0b21SZXNvdXJjZSh0aGlzLCAnU2VlZERhdGEnLCB7XHJcbiAgICAgICAgICAgIHNlcnZpY2VUb2tlbjogc2VlZFByb3ZpZGVyLnNlcnZpY2VUb2tlbixcclxuICAgICAgICAgICAgcHJvcGVydGllczogeyBzZWVkVmVyc2lvbjogMSB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIEFydC4gOSDigJQgbm8gc2hhcmVkIC8gaGFyZGNvZGVkIGNyZWRlbnRpYWxzLlxyXG4gICAgICAgIC8vIEVhY2ggc2VlZGVkIHVzZXIgZ2V0cyBhIENSWVBUT0dSQVBISUNBTExZIFJBTkRPTSB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgICAgICAvLyB0aGF0IHNhdGlzZmllcyB0aGUgc3RyZW5ndGhlbmVkIHBhc3N3b3JkIHBvbGljeS4gVGhlIHBhc3N3b3JkIGlzOlxyXG4gICAgICAgIC8vICAgLSBpc3N1ZWQgYXMgVEVNUE9SQVJZIChQZXJtYW5lbnQ9ZmFsc2UpIHNvIENvZ25pdG8gZm9yY2VzIGFcclxuICAgICAgICAvLyAgICAgcGFzc3dvcmQgY2hhbmdlIGF0IGZpcnN0IGxvZ2luLFxyXG4gICAgICAgIC8vICAgLSBzdG9yZWQgaW4gQVdTIFNlY3JldHMgTWFuYWdlciB1bmRlclxyXG4gICAgICAgIC8vICAgICAvdGlyeWFxL3NlZWQtdXNlcnMvPHVzZXJuYW1lPiwgZW5jcnlwdGVkIHdpdGggdGhlIGRhdGEgQ01LLFxyXG4gICAgICAgIC8vICAgLSBuZXZlciBsb2dnZWQsIG5ldmVyIHJldHVybmVkIHRvIHRoZSBBUEkgY2FsbGVyLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHVzZXJzRm4gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUaXJ5YXFVc2Vyc0Z1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0aXJ5YXEtY3JlYXRlLXVzZXJzJyxcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICBEQVRBX0tNU19LRVlfSUQ6IHRpcnlhcURhdGFLZXkua2V5SWRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXHJcbmNvbnN0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIEFkbWluQWRkVXNlclRvR3JvdXBDb21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcicpO1xyXG5jb25zdCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBDcmVhdGVTZWNyZXRDb21tYW5kLCBQdXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInKTtcclxuY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XHJcblxyXG5jb25zdCBjb2duaXRvID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHt9KTtcclxuY29uc3Qgc2VjcmV0cyA9IG5ldyBTZWNyZXRzTWFuYWdlckNsaWVudCh7fSk7XHJcbmNvbnN0IFBPT0wgPSBwcm9jZXNzLmVudi5VU0VSX1BPT0xfSUQ7XHJcbmNvbnN0IEtFWSAgPSBwcm9jZXNzLmVudi5EQVRBX0tNU19LRVlfSUQ7XHJcblxyXG5jb25zdCBTRUVEX1VTRVJTID0gW1xyXG4gICAgeyB1c2VybmFtZTogJ2FkbWluMScsICAgICAgbmFtZTogJ0FkbWluIE9uZScsICAgICAgZW1haWw6ICdhZG1pbjFAdGlyeWFxLmNvbScsICAgICAgZ3JvdXA6ICdBZG1pbicgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdhZG1pbjInLCAgICAgIG5hbWU6ICdBZG1pbiBUd28nLCAgICAgIGVtYWlsOiAnYWRtaW4yQHRpcnlhcS5jb20nLCAgICAgIGdyb3VwOiAnQWRtaW4nIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAnZGV2ZWxvcGVyMScsICBuYW1lOiAnRGV2ZWxvcGVyIE9uZScsICBlbWFpbDogJ2RldjFAdGlyeWFxLmNvbScsICAgICAgICBncm91cDogJ0RldmVsb3BlcnMnIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAnZGV2ZWxvcGVyMicsICBuYW1lOiAnRGV2ZWxvcGVyIFR3bycsICBlbWFpbDogJ2RldjJAdGlyeWFxLmNvbScsICAgICAgICBncm91cDogJ0RldmVsb3BlcnMnIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAnZG9jdG9yMScsICAgICBuYW1lOiAnRG9jdG9yIE9uZScsICAgICBlbWFpbDogJ2RvY3RvcjFAdGlyeWFxLmNvbScsICAgICBncm91cDogJ0RvY3RvcnMnIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAnZG9jdG9yMicsICAgICBuYW1lOiAnRG9jdG9yIFR3bycsICAgICBlbWFpbDogJ2RvY3RvcjJAdGlyeWFxLmNvbScsICAgICBncm91cDogJ0RvY3RvcnMnIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAncGhhcm1hY2lzdDEnLCBuYW1lOiAnUGhhcm1hY2lzdCBPbmUnLCBlbWFpbDogJ3BoYXJtYWNpc3QxQHRpcnlhcS5jb20nLCBncm91cDogJ1BoYXJtYWNpc3RzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ3BoYXJtYWNpc3QyJywgbmFtZTogJ1BoYXJtYWNpc3QgVHdvJywgZW1haWw6ICdwaGFybWFjaXN0MkB0aXJ5YXEuY29tJywgZ3JvdXA6ICdQaGFybWFjaXN0cycgfVxyXG5dO1xyXG5cclxuLy8gR2VuZXJhdGVzIGEgMjAtY2hhciBwYXNzd29yZCB0aGF0IGFsd2F5cyBzYXRpc2ZpZXMgdGhlIHBvbGljeTpcclxuLy8gdXBwZXIsIGxvd2VyLCBkaWdpdCwgc3ltYm9sLCBsZW5ndGggPj0gMTIuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlVGVtcFBhc3N3b3JkKCkge1xyXG4gICAgY29uc3QgdXBwZXIgPSAnQUJDREVGR0hKS0xNTlBRUlNUVVZXWFlaJztcclxuICAgIGNvbnN0IGxvd2VyID0gJ2FiY2RlZmdoaWprbW5wcXJzdHV2d3h5eic7XHJcbiAgICBjb25zdCBkaWdpdCA9ICcyMzQ1Njc4OSc7XHJcbiAgICBjb25zdCBzeW1ib2wgPSAnIUAjJCVeJiooKS1fPSsnO1xyXG4gICAgY29uc3QgYWxsID0gdXBwZXIgKyBsb3dlciArIGRpZ2l0ICsgc3ltYm9sO1xyXG4gICAgY29uc3QgcGljayA9IChzZXQpID0+IHNldFtjcnlwdG8ucmFuZG9tSW50KDAsIHNldC5sZW5ndGgpXTtcclxuICAgIGxldCBwd2QgPSBwaWNrKHVwcGVyKSArIHBpY2sobG93ZXIpICsgcGljayhkaWdpdCkgKyBwaWNrKHN5bWJvbCk7XHJcbiAgICB3aGlsZSAocHdkLmxlbmd0aCA8IDIwKSBwd2QgKz0gcGljayhhbGwpO1xyXG4gICAgcmV0dXJuIHB3ZC5zcGxpdCgnJykuc29ydCgoKSA9PiBjcnlwdG8ucmFuZG9tSW50KDAsIDIpIC0gMSkuam9pbignJyk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHN0b3JlU2VjcmV0KHVzZXJuYW1lLCBwYXNzd29yZCkge1xyXG4gICAgY29uc3QgbmFtZSA9ICcvdGlyeWFxL3NlZWQtdXNlcnMvJyArIHVzZXJuYW1lO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBzZWNyZXRzLnNlbmQobmV3IENyZWF0ZVNlY3JldENvbW1hbmQoe1xyXG4gICAgICAgICAgICBOYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICBEZXNjcmlwdGlvbjogJ1RlbXBvcmFyeSBwYXNzd29yZCBmb3Igc2VlZGVkIFRpcnlhcSB1c2VyIOKAlCBtdXN0IGJlIGNoYW5nZWQgb24gZmlyc3QgbG9naW4uJyxcclxuICAgICAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lLCB0ZW1wb3JhcnlQYXNzd29yZDogcGFzc3dvcmQsIG11c3RDaGFuZ2U6IHRydWUgfSksXHJcbiAgICAgICAgICAgIEttc0tleUlkOiBLRVlcclxuICAgICAgICB9KSk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgaWYgKGUubmFtZSA9PT0gJ1Jlc291cmNlRXhpc3RzRXhjZXB0aW9uJykge1xyXG4gICAgICAgICAgICBhd2FpdCBzZWNyZXRzLnNlbmQobmV3IFB1dFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgICAgICAgICBTZWNyZXRJZDogbmFtZSxcclxuICAgICAgICAgICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZSwgdGVtcG9yYXJ5UGFzc3dvcmQ6IHBhc3N3b3JkLCBtdXN0Q2hhbmdlOiB0cnVlIH0pXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdEZWxldGUnKSByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6ICd1c2VycycgfTtcclxuICAgIGZvciAoY29uc3QgdXNlciBvZiBTRUVEX1VTRVJTKSB7XHJcbiAgICAgICAgY29uc3QgdGVtcFBhc3N3b3JkID0gZ2VuZXJhdGVUZW1wUGFzc3dvcmQoKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBQZXJtYW5lbnQ9ZmFsc2UgKGRlZmF1bHQpIOKGkiBDb2duaXRvIGZsYWdzIEZPUkNFX0NIQU5HRV9QQVNTV09SRC5cclxuICAgICAgICAgICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgICAgICAgICAgIFVzZXJQb29sSWQ6IFBPT0wsXHJcbiAgICAgICAgICAgICAgICBVc2VybmFtZTogdXNlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIE1lc3NhZ2VBY3Rpb246ICdTVVBQUkVTUycsXHJcbiAgICAgICAgICAgICAgICBUZW1wb3JhcnlQYXNzd29yZDogdGVtcFBhc3N3b3JkLFxyXG4gICAgICAgICAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICdlbWFpbCcsICAgICAgICAgIFZhbHVlOiB1c2VyLmVtYWlsIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLCBWYWx1ZTogJ3RydWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBOYW1lOiAnbmFtZScsICAgICAgICAgICBWYWx1ZTogdXNlci5uYW1lIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBOYW1lOiAnZ2VuZGVyJywgICAgICAgICBWYWx1ZTogJ01hbGUnIH1cclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluQWRkVXNlclRvR3JvdXBDb21tYW5kKHtcclxuICAgICAgICAgICAgICAgIFVzZXJQb29sSWQ6IFBPT0wsIFVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLCBHcm91cE5hbWU6IHVzZXIuZ3JvdXBcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBhd2FpdCBzdG9yZVNlY3JldCh1c2VyLnVzZXJuYW1lLCB0ZW1wUGFzc3dvcmQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgaWYgKGUubmFtZSA9PT0gJ1VzZXJuYW1lRXhpc3RzRXhjZXB0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgLy8gVXNlciBhbHJlYWR5IGV4aXN0cyDigJQgZG8gbm90IHJlc2V0IHRoZWlyIHBhc3N3b3JkIHNpbGVudGx5LlxyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6ICd1c2VycycgfTtcclxufTtcclxuICAgICAgICAgICAgYClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdXNlcnNGbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcclxuICAgICAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5BZGRVc2VyVG9Hcm91cCdcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICB1c2Vyc0ZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpDcmVhdGVTZWNyZXQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpQdXRTZWNyZXRWYWx1ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0J1xyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOnNlY3JldHNtYW5hZ2VyOiR7cmVnaW9ufToke2FjY291bnRJZH06c2VjcmV0Oi90aXJ5YXEvc2VlZC11c2Vycy8qYF1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyBMYW1iZGEgbXVzdCBiZSBhbGxvd2VkIHRvIHVzZSB0aGUgZGF0YSBDTUsgdG8gZW5jcnlwdCB0aGUgc2VjcmV0LlxyXG4gICAgICAgIHRpcnlhcURhdGFLZXkuZ3JhbnRFbmNyeXB0RGVjcnlwdCh1c2Vyc0ZuKTtcclxuXHJcbiAgICAgICAgY29uc3QgdXNlcnNQcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcih0aGlzLCAnVXNlcnNQcm92aWRlcicsIHsgb25FdmVudEhhbmRsZXI6IHVzZXJzRm4gfSk7XHJcbiAgICAgICAgbmV3IGNkay5DdXN0b21SZXNvdXJjZSh0aGlzLCAnQ3JlYXRlVXNlcnMnLCB7XHJcbiAgICAgICAgICAgIHNlcnZpY2VUb2tlbjogdXNlcnNQcm92aWRlci5zZXJ2aWNlVG9rZW4sXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgdXNlclBvb2xJZDogdXNlclBvb2wudXNlclBvb2xJZCB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIEFQSSBHYXRld2F5ICsgSldUIEF1dGhvcml6ZXJcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IEh0dHBKd3RBdXRob3JpemVyKCdUaXJ5YXFBdXRob3JpemVyJywgYGh0dHBzOi8vY29nbml0by1pZHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHt1c2VyUG9vbC51c2VyUG9vbElkfWAsIHtcclxuICAgICAgICAgICAgand0QXVkaWVuY2U6IFthcHBDbGllbnQudXNlclBvb2xDbGllbnRJZF0sXHJcbiAgICAgICAgICAgIGlkZW50aXR5U291cmNlOiBbJyRyZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJ11cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5IChpbnRlZ3JpdHkgJiBjb25maWRlbnRpYWxpdHkpLlxyXG4gICAgICAgIC8vIENPUlMgaXMgcmVzdHJpY3RlZCB0byB0aGUgcHJvZHVjdGlvbiBDbG91ZEZyb250IGRvbWFpbiBwbHVzIGxvY2FsaG9zdFxyXG4gICAgICAgIC8vIGZvciBkZXYuIFdpbGRjYXJkIG9yaWdpbnMgYXJlIGZvcmJpZGRlbiDigJQgdGhleSBlbmFibGUgY3Jvc3Mtc2l0ZSBkYXRhXHJcbiAgICAgICAgLy8gZXhmaWx0cmF0aW9uIGZyb20gdGhlIHBhdGllbnQncyBicm93c2VyLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFN0ZXAgMiAvIFN0ZXAgMyBmaXgg4oCUIGV2ZXJ5IHRlbmFudCBzdWJkb21haW4gbXVzdCBiZSBvbiB0aGlzIGxpc3QsXHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBicm93c2VyIHJlamVjdHMgQVBJIGNhbGxzIGZyb20gdGlyeWFxLmFrd2Fkb25hLmNvbSxcclxuICAgICAgICAvLyBhbHNoaWZhYS5ha3dhZG9uYS5jb20sIGV0Yy4gQWRkIHRoZSBuZXcgc2x1ZyBoZXJlIHdoZW5ldmVyIGFcclxuICAgICAgICAvLyB0ZW5hbnQgaXMgb25ib2FyZGVkIChzYW1lIGxpc3QgbGl2ZXMgaW4gc3JjL2FwcC9zZXJ2aWNlcy90ZW5hbnQuc2VydmljZS50cykuXHJcbiAgICAgICAgY29uc3QgdGVuYW50U2x1Z3MgPSBbJ3RpcnlhcScsICdhbHNoaWZhYSddO1xyXG4gICAgICAgIGNvbnN0IHRlbmFudE9yaWdpbnMgPSB0ZW5hbnRTbHVncy5tYXAoc2x1ZyA9PiBgaHR0cHM6Ly8ke3NsdWd9LmFrd2Fkb25hLmNvbWApO1xyXG5cclxuICAgICAgICBjb25zdCBhbGxvd2VkT3JpZ2lucyA9IFtcclxuICAgICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMCcsXHJcbiAgICAgICAgICAgICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQnLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly9ha3dhZG9uYS5jb20nLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly93d3cuYWt3YWRvbmEuY29tJyxcclxuICAgICAgICAgICAgLi4udGVuYW50T3JpZ2luc1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgYXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnVGlyeWFxSHR0cEFwaScsIHtcclxuICAgICAgICAgICAgYXBpTmFtZTogJ3RpcnlhcS1hcGknLFxyXG4gICAgICAgICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgICAgICAgICBhbGxvd09yaWdpbnM6IGFsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5HRVQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuUEFUQ0gsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5PUFRJT05TXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtQ2xpZW50LVJlcXVlc3QtSWQnXSxcclxuICAgICAgICAgICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24ubWludXRlcygxMClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCByb3V0ZSA9IChwYXRoOiBzdHJpbmcsIG1ldGhvZHM6IGFwaWd3djIuSHR0cE1ldGhvZFtdLCBoYW5kbGVyOiBsYW1iZGEuRnVuY3Rpb24pID0+XHJcbiAgICAgICAgICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICAgICAgICAgICAgcGF0aCxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHMsXHJcbiAgICAgICAgICAgICAgICBpbnRlZ3JhdGlvbjogbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihwYXRoLnJlcGxhY2UoL1teYS16QS1aMC05XS9nLCAnJykgKyBtZXRob2RzLmpvaW4oJycpLCBoYW5kbGVyKSxcclxuICAgICAgICAgICAgICAgIGF1dGhvcml6ZXJcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbFBhdGllbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFBhdGllbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcmVzdG9yZScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCB1cGRhdGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMvc2VhcmNoJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxEb2N0b3JzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZURvY3RvckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMve2RvY3RvcklEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0RG9jdG9yQnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMve2RvY3RvcklEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCB1cGRhdGVEb2N0b3JGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL3tkb2N0b3JJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZURvY3RvckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMvZW1haWwve2VtYWlsfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0RG9jdG9yQnlFbWFpbEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxQYXltZW50c0ZvclBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZVBhdGllbnRQYXltZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMve3BheW1lbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFBheW1lbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMve3BheW1lbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlUGF0aWVudFBheW1lbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cy97cGF5bWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlUGF5bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BheW1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL2ludm9pY2VzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxJbnZvaWNlc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3N1cmdlcmllcycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgbGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vc3VyZ2VyaWVzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlUGF0aWVudFN1cmdlcnlGbik7XHJcbiAgICAgICAgcm91dGUoJy9zdXJnZXJpZXMve3N1cmdlcnlJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFN1cmdlcnlCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbERlcGFydG1lbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVOZXdEZXBhcnRtZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMvYnVsaycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVBbGxEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3NwZWNpYWxpemF0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsU3BlY2lhbGl6YXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlTmV3U3BlY2lhbGl6YXRpb25Gbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMvYnVsaycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZUFsbFNwZWNpYWxpemF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3N0YXRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGFkbWluUGFuZWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9hZG1pbi91c2Vycy97dXNlcm5hbWV9L2Rpc2FibGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9lbmFibGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9zZXQtcGFzc3dvcmQnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vYXVkaXQnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGFkbWluUGFuZWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9leGFtaW5hdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBleGFtaW5hdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9leGFtaW5hdGlvbnMve2V4YW1JZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zL3tleGFtSWR9L3NpZ25vZmYnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBleGFtaW5hdGlvbnNGbik7XHJcbiAgICAgICAgLy8gUGhhcm1hY3kgcm91dGVzIOKAlCBwYXRocyBtYXRjaCB0aGUgdGlyeWFxLXBoYXJtYWN5IExhbWJkYSdzIGludGVybmFsIHJvdXRlci5cclxuICAgICAgICAvLyAoTGFtYmRhIGRpc3BhdGNoZXMgb24gZXZlbnQucmF3UGF0aDsgQ0RLIG11c3QgcmVnaXN0ZXIgaWRlbnRpY2FsIHBhdGhzLilcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L21lZGljYXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9tZWRpY2F0aW9ucy97bWVkSWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvaW52ZW50b3J5JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9pbnZlbnRvcnkve21lZElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3ByZXNjcmlwdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3ByZXNjcmlwdGlvbnMve3J4SWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvZGlzcGVuc2UnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3B1cmNoYXNlLW9yZGVycycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvcHVyY2hhc2Utb3JkZXJzL3twb0lkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2FsZXJ0cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgLy8gRG9jdW1lbnQgbWFuYWdlciDigJQgcGF0aHMgbWF0Y2ggdGhlIHRpcnlhcS1kb2N1bWVudC1tYW5hZ2VyIExhbWJkYSdzXHJcbiAgICAgICAgLy8gaW50ZXJuYWwgcm91dGVyIGFuZCB0aGUgQW5ndWxhciBEb2N1bWVudFNlcnZpY2UgY2FsbHMuXHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvdXBsb2FkLXVybCcsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9kb3dubG9hZC11cmwnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvbGlzdCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL2ZvbGRlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9kZWxldGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2F1ZGl0JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYXVkaXRGbik7XHJcbiAgICAgICAgcm91dGUoJy9hcHBvaW50bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhcHBvaW50bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9hcHBvaW50bWVudHMve2FwcHRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYXBwb2ludG1lbnRzRm4pO1xyXG5cclxuICAgICAgICAvLyBIb3NwaXRhbCBjYWxlbmRhciByb3V0ZXMg4oCUIFRpcnlhcS1sb2NhbCwgSldULWF1dGhlbnRpY2F0ZWQuXHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGNhbGVuZGFyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvY2FsZW5kYXJzL3tjYWxlbmRhcklkfS9ldmVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0vZXZlbnRzL3tldmVudElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBjYWxlbmRhckZuKTtcclxuXHJcbiAgICAgICAgLy8gQmxvb2QgQmFuayBtb2R1bGVcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMve2Rvbm9ySWR9JywgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL2Rvbm9ycy97ZG9ub3JJZH0vZG9uYXRpb25zJywgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL2RvbmF0aW9ucycsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3VuaXRzJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3VuaXRzL3t1bml0SWR9JywgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvc3RvY2snLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMve3JlcXVlc3RJZH0nLCAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9yZXF1ZXN0cy97cmVxdWVzdElkfS9jcm9zc21hdGNoJywgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9yZXF1ZXN0cy97cmVxdWVzdElkfS9pc3N1ZScsICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuXHJcbiAgICAgICAgLy8gU2NyaWJlRmlyc3QgUGhhc2UgMSDigJQgU09BUCBzY3JpYmUgcm91dGVzXHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMve2lkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgc2NyaWJlRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zL3tpZH0vc29hcCcsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHNjcmliZUZuKTtcclxuICAgICAgICByb3V0ZSgnL3NjcmliZS9zZXNzaW9ucy97aWR9L2FwcHJvdmUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFMzICsgQ2xvdWRGcm9udFxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFGcm9udGVuZEJ1Y2tldCcsIHtcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFEYXRhS2V5LFxyXG4gICAgICAgICAgICBidWNrZXRLZXlFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGFjY2Vzc0xvZ3NCdWNrZXQsXHJcbiAgICAgICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NQcmVmaXg6ICdzMy1hY2Nlc3MvZnJvbnRlbmQvJyxcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ2V4cGlyZS1ub25jdXJyZW50LXZlcnNpb25zJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMTgwKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG9hYyA9IG5ldyBjbG91ZGZyb250LlMzT3JpZ2luQWNjZXNzQ29udHJvbCh0aGlzLCAnVGlyeWFxT0FDJywge1xyXG4gICAgICAgICAgICBzaWduaW5nOiBjbG91ZGZyb250LlNpZ25pbmcuU0lHVjRfTk9fT1ZFUlJJREVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdUaXJ5YXFEaXN0cmlidXRpb24nLCB7XHJcbiAgICAgICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgICAgICAgICAgb3JpZ2luOiBjbG91ZGZyb250T3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChzaXRlQnVja2V0LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luQWNjZXNzQ29udHJvbDogb2FjXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBWaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICAgICAgICAgIGNhY2hlUG9saWN5OiBDYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcclxuICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBBbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kuU0VDVVJJVFlfSEVBREVSU1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICBtaW5pbXVtUHJvdG9jb2xWZXJzaW9uOiBjbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAyMSxcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZSByZWdyZXNzaW9uOiBXQUYgdGVtcG9yYXJpbHkgZGlzYWJsZWQgdG8gc3RvcCBjaGFyZ2VzLlxyXG4gICAgICAgICAgICAvLyBSZS1lbmFibGUgYnkgc2V0dGluZyB3ZWJBY2xJZCBiYWNrIHRvIHByb3BzPy53ZWJBY2xBcm4gYW5kXHJcbiAgICAgICAgICAgIC8vIHJlLWluc3RhdGluZyB0aGUgVGlyeWFxRWRnZVN0YWNrIGluIGJpbi90aXJ5YXEtY2RrLnRzLlxyXG4gICAgICAgICAgICAvLyB3ZWJBY2xJZDogcHJvcHM/LndlYkFjbEFybixcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgYXVkaXQgdHJhaWwg4oCUIGxvZyBldmVyeSBDbG91ZEZyb250IHJlcXVlc3RcclxuICAgICAgICAgICAgLy8gKHZpZXdlciBJUCwgcmVxdWVzdCBVUkksIHJlc3BvbnNlIHN0YXR1cykuIFNlbnQgdG8gdGhlXHJcbiAgICAgICAgICAgIC8vIHNlcnZpY2UtbG9ncyBidWNrZXQgYmVjYXVzZSBDbG91ZEZyb250IGNhbm5vdCBkZWxpdmVyIHRvIGFuXHJcbiAgICAgICAgICAgIC8vIFNTRS1LTVMgZGVzdGluYXRpb24uXHJcbiAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXHJcbiAgICAgICAgICAgIGxvZ0J1Y2tldDogYWNjZXNzTG9nc0J1Y2tldCxcclxuICAgICAgICAgICAgbG9nRmlsZVByZWZpeDogJ2Nsb3VkZnJvbnQvJyxcclxuICAgICAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICAgICAgICAgIHsgaHR0cFN0YXR1czogNDAzLCByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCwgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBodHRwU3RhdHVzOiA0MDQsIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLCByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnIH1cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgY29tbWVudDogJ1RpcnlhcSBIb3NwaXRhbCBQbGF0Zm9ybSdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2l0ZUJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYCR7c2l0ZUJ1Y2tldC5idWNrZXRBcm59LypgXSxcclxuICAgICAgICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZnJvbnQuYW1hem9uYXdzLmNvbScpXSxcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ0FXUzpTb3VyY2VBcm4nOiBgYXJuOmF3czpjbG91ZGZyb250Ojoke2FjY291bnRJZH06ZGlzdHJpYnV0aW9uLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkfWBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRG9jdW1lbnRzIGJ1Y2tldCAob3duZWQgYnkgVEhJUyBhY2NvdW50KVxyXG4gICAgICAgIC8vIFRoZSBvbGQgYHRpcnlhcS1kb2N1bWVudHNgIG5hbWUgYmVsb25ncyB0byBhIGRpZmZlcmVudCBhY2NvdW50LCB3aGljaFxyXG4gICAgICAgIC8vIGlzIHdoeSBDT1JTIGNvdWxkIG5ldmVyIGJlIHNldC4gV2UgY3JlYXRlIG91ciBvd24gYWNjb3VudC1zY29wZWRcclxuICAgICAgICAvLyBidWNrZXQgYW5kIGRlY2xhcmUgQ09SUyBhcyBhIHByb3BlcnR5IHNvIGJyb3dzZXLihpJTMyBwcmUtc2lnbmVkIFBVVC9HRVRcclxuICAgICAgICAvLyB1cGxvYWRzIGFyZSBhbGxvd2VkLiBUaGUgTGFtYmRhIHJlYWRzIHRoZSBuYW1lIGZyb20gRE9DVU1FTlRTX0JVQ0tFVC5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBkb2N1bWVudHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFEb2N1bWVudHNCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtZG9jdW1lbnRzLSR7YWNjb3VudElkfS0ke3JlZ2lvbn1gLFxyXG4gICAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBjb3JzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULCBzMy5IdHRwTWV0aG9kcy5QVVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLkhFQURdLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAnQ29udGVudC1MZW5ndGgnLCAnQ29udGVudC1UeXBlJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4QWdlOiAzNjAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIGRvY3VtZW50TWFuYWdlckZuLmFkZEVudmlyb25tZW50KCdET0NVTUVOVFNfQlVDS0VUJywgZG9jdW1lbnRzQnVja2V0LmJ1Y2tldE5hbWUpO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBPdXRwdXRzXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHsgdmFsdWU6IGFwaS5hcGlFbmRwb2ludCwgZGVzY3JpcHRpb246ICdIVFRQIEFQSSBVUkwg4oaSIHVwZGF0ZSBDb25maWcudHMgdGlyeWFxVXJsJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVybCcsIHsgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCwgZGVzY3JpcHRpb246ICdGcm9udGVuZCBVUkwg4oaSIHVwZGF0ZSBjYWxsYmFja1VybHMgKyBsb2dvdXRVcmxzIHRoZW4gcmVkZXBsb3knIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7IHZhbHVlOiBzaXRlQnVja2V0LmJ1Y2tldE5hbWUsIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IOKGkiBuZyBidWlsZCArIGF3cyBzMyBzeW5jJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHsgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQg4oaSIHVwZGF0ZSBhcHAuY29uZmlnLnRzIGF1dGhvcml0eScgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcENsaWVudElkJywgeyB2YWx1ZTogYXBwQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBBcHAgQ2xpZW50IElEIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cyBjbGllbnRJZCcgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywgeyB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLCBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEIOKGkiBjYWNoZSBpbnZhbGlkYXRpb24nIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2duaXRvQXV0aG9yaXR5JywgeyB2YWx1ZTogYGh0dHBzOi8vY29nbml0by1pZHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHt1c2VyUG9vbC51c2VyUG9vbElkfWAsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBhdXRob3JpdHkgVVJMIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cycgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RvY3VtZW50c0J1Y2tldE5hbWUnLCB7IHZhbHVlOiBkb2N1bWVudHNCdWNrZXQuYnVja2V0TmFtZSwgZGVzY3JpcHRpb246ICdEb2N1bWVudHMgYnVja2V0ICh1cGxvYWRzIHZpYSBwcmUtc2lnbmVkIFVSTHMpJyB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=