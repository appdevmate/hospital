import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface AkwadonaStackProps extends cdk.StackProps {
    /** ARN of the CloudFront-scoped WAFv2 WebACL created in the edge (us-east-1) stack. */
    webAclArn?: string;
}
import { ViewerProtocolPolicy, AllowedMethods, CachePolicy } from 'aws-cdk-lib/aws-cloudfront';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';

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

export class AkwadonaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: AkwadonaStackProps) {
        super(scope, id, props);

        const accountId = cdk.Stack.of(this).account;
        const region = cdk.Stack.of(this).region;

        // ─────────────────────────────────────────────────────────────────────
        // Compliance: PDPPL Art. 9 — encryption at rest with customer control.
        // Two CMKs:
        //   - akwadonaDataKey  → encrypts DynamoDB and the frontend S3 bucket
        //   - akwadonaAuditKey → encrypts the audit log bucket (separated so
        //                       data-plane key compromise does not invalidate
        //                       the audit chain)
        // Annual automatic rotation; key admins limited to the deploying
        // principal; usage limited to specific AWS services in this account.
        // ─────────────────────────────────────────────────────────────────────
        const akwadonaDataKey = new kms.Key(this, 'AkwadonaDataKey', {
            alias: 'alias/akwadona/data',
            description: 'CMK for Akwadona DynamoDB and frontend bucket — PDPPL Art. 9.',
            enableKeyRotation: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            pendingWindow: cdk.Duration.days(30)
        });

        const akwadonaAuditKey = new kms.Key(this, 'AkwadonaAuditKey', {
            alias: 'alias/akwadona/audit',
            description: 'CMK for Akwadona audit log bucket and CloudTrail — segregated from data key.',
            enableKeyRotation: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            pendingWindow: cdk.Duration.days(30)
        });

        // CloudTrail (the AWS service) needs permission to use the audit CMK
        // when it writes encrypted log files into the audit bucket.
        akwadonaAuditKey.addToResourcePolicy(
            new iam.PolicyStatement({
                sid: 'AllowCloudTrailEncryptLogs',
                actions: ['kms:GenerateDataKey*', 'kms:DescribeKey'],
                principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
                resources: ['*'],
                conditions: {
                    StringEquals: { 'aws:SourceAccount': cdk.Aws.ACCOUNT_ID }
                }
            })
        );

        // ─────────────────────────────────────────────────────────────────────
        // Compliance: separate "service access logs" bucket.
        // S3 server access logging and CloudFront standard logging both
        // refuse SSE-KMS destination buckets, so we keep these AWS-service
        // logs in a dedicated bucket with SSE-S3 + versioning + lifecycle.
        // The high-assurance (CMK + Object Lock) bucket below holds
        // CloudTrail and exported application audit only.
        // ─────────────────────────────────────────────────────────────────────
        const accessLogsBucket = new s3.Bucket(this, 'AkwadonaAccessLogsBucket', {
            bucketName: `akwadona-access-logs-${accountId}-${region}`,
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
        const auditBucket = new s3.Bucket(this, 'AkwadonaAuditBucket', {
            bucketName: `akwadona-audit-v5-${accountId}-${region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: akwadonaAuditKey,
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
        const trail = new cloudtrail.Trail(this, 'AkwadonaCloudTrail', {
            trailName: 'akwadona-cloudtrail',
            bucket: auditBucket,
            s3KeyPrefix: 'cloudtrail',
            isMultiRegionTrail: true,
            includeGlobalServiceEvents: true,
            enableFileValidation: true,
            sendToCloudWatchLogs: true,
            cloudWatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_YEAR,
            encryptionKey: akwadonaAuditKey
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
            encryptionKey: akwadonaDataKey,
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
        const userPool = new cognito.UserPool(this, 'AkwadonaUserPool', {
            userPoolName: 'akwadona-user-pool',
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

        const appClient = userPool.addClient('AkwadonaAppClient', {
            userPoolClientName: 'Akwadona',
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

        userPool.addDomain('AkwadonaDomain', {
            cognitoDomain: { domainPrefix: 'akwadona-hospital' }
        });

        // Step 7 — Add `Operator` group for Akwadona platform staff. Members
        // of this group access the operator console at www.akwadona.com,
        // bypass tenantId checks, but have NO kms:Decrypt on any tenant key.
        // Two independent layers enforce this:
        //   1. KMS key-policy condition matches only tenant Lambda
        //      execution roles, not human-derived JWT claims.
        //   2. Step 9 — explicit IAM DENY on kms:Decrypt + sibling actions
        //      on the operator Lambda role itself (see operatorConsoleFn
        //      addToRolePolicy block below). Explicit DENY beats any ALLOW.
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

        // Step 7j — keep the pre-token Lambda WARM. Cognito hard-caps trigger
        // execution at 5 seconds; a Node cold start (+ DDB slug/doctor lookups)
        // can exceed that and the user sees a 504 on their FIRST login attempt.
        // A 5-minute EventBridge ping keeps one container hot. The handler
        // short-circuits on `_warmup` so the ping costs ~1 ms of compute.
        new events.Rule(this, 'PreTokenWarmerRule', {
            schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
            targets: [new eventsTargets.LambdaFunction(preTokenFn, {
                event: events.RuleTargetInput.fromObject({ _warmup: true })
            })]
        });
        // Step C.3 — pre-token Lambda scans DOCTOR profile rows to resolve
        // the application doctorId UUID for the signed-in user. Read-only.
        table.grantReadData(preTokenFn);

        const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;
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
        // `AkwadonaCdkStack-*ServiceRole*` — that's every Lambda execution role
        // in this stack, automatically. No IAM grant from CDK is needed.
        //
        // To onboard a new tenant: create a CMK in us-east-1 with alias
        // `akwadona-tenant-<slug>`, apply the standard key policy template,
        // then add its tenantId → ARN entry below and redeploy.
        // ─────────────────────────────────────────────────────────────────────
        // Empty — every tenant is now onboarded via the operator wizard, which
        // writes its data + HMAC key ARNs into the TENANT#<slug>/PROFILE row.
        // The crypto helper reads those from DDB at runtime.
        const tenantKeys: Record<string, string> = {};

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
        // Empty for the same reason as tenantKeys — wizard writes HMAC ARN
        // to the TENANT row; crypto helper resolves it at runtime.
        const tenantHmacKeys: Record<string, string> = {};

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
        // Step 8 — Lambda factory now accepts an optional `functionName` override
        // so we can rename a deployed Lambda (akwadona-* → akwadona-*) while
        // keeping the source folder untouched. Folder structure changes are
        // cosmetic; the deployed name is what shows up in AWS Console,
        // CloudWatch logs, and customer-facing artifacts.
        const fn = (id: string, folder: string, handler: string, runtime: lambda.Runtime = lambda.Runtime.NODEJS_18_X, extraEnv: Record<string, string> = {}, opts: { memorySize?: number; functionName?: string } = {}) =>
            new lambda.Function(this, id, {
                functionName: opts.functionName ?? folder,
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
        const getAllPatientsFn = fn('GetAllPatients', 'getAllPatients', 'index.handler', undefined, {}, { functionName: 'akwadona-get-all-patients' });
        const getPatientByIDFn = fn('GetPatientByID', 'getPatientByID', 'index.handler', undefined, {}, { functionName: 'akwadona-get-patient-by-id' });
        const createPatientFn = fn('CreatePatient', 'createPatient', 'index.handler', undefined, {}, { functionName: 'akwadona-create-patient' });
        const updatePatientFn = fn('UpdatePatient', 'updatePatient', 'index.handler', undefined, {}, { functionName: 'akwadona-update-patient' });
        const deletePatientFn = fn('DeletePatient', 'deletePatient', 'index.handler', undefined, {}, { functionName: 'akwadona-delete-patient' });
        const getPatientsDataByFiltersFn = fn('GetPatientsDataByFilters', 'getPatientsDataByFilters', 'index.handler', undefined, {}, { functionName: 'akwadona-get-patients-by-filters' });
        const getAllDoctorsFn = fn('GetAllDoctors', 'getAllDoctors', 'index.handler', undefined, {}, { functionName: 'akwadona-get-all-doctors' });
        const getDoctorByIDFn = fn('GetDoctorByID', 'getDoctorByID', 'index.handler', undefined, {}, { functionName: 'akwadona-get-doctor-by-id' });
        const getDoctorByEmailFn = fn('GetDoctorByEmail', 'getDoctorByEmail', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-get-doctor-by-email' });
        const createDoctorFn = fn('CreateDoctor', 'createDoctor', 'index.handler', undefined, {}, { functionName: 'akwadona-create-doctor' });
        const updateDoctorFn = fn('UpdateDoctor', 'updateDoctor', 'index.handler', undefined, {}, { functionName: 'akwadona-update-doctor' });
        const deleteDoctorFn = fn('DeleteDoctor', 'deleteDoctor', 'index.handler', undefined, {}, { functionName: 'akwadona-delete-doctor' });
        const createPatientPaymentFn = fn('CreatePatientPayment', 'createPatientPayment', 'index.handler', undefined, {}, { functionName: 'akwadona-create-payment' });
        const getAllPaymentsForPatientFn = fn('GetAllPaymentsForPatient', 'getAllPaymentsForPatient', 'index.handler', undefined, {}, { functionName: 'akwadona-get-payments-for-patient' });
        const listAllPaymentsForPatientByIDFn = fn('ListAllPaymentsForPatientByID', 'listAllPaymentsForPatientByID', 'index.handler', undefined, {}, { functionName: 'akwadona-list-payments-by-patient' });
        const updatePatientPaymentFn = fn('UpdatePatientPayment', 'updatePatientPayment', 'index.handler', undefined, {}, { functionName: 'akwadona-update-payment' });
        const getPaymentByIDFn = fn('GetPaymentByID', 'getPaymentByID', 'index.handler', undefined, {}, { functionName: 'akwadona-get-payment-by-id' });
        const deletePaymentFn = fn('DeletePayment', 'deletePayment', 'index.handler', undefined, {}, { functionName: 'akwadona-delete-payment' });
        const getAllInvoicesFn = fn('GetAllInvoices', 'getAllInvoices', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-get-all-invoices' });
        // createPatientSurgeryFn removed (was an unimplemented stub) to free
        // CFN resources for the operator console. Re-add when the surgery
        // module is built out.
        const listAllSurgeriesForPatientByIDFn = fn('ListAllSurgeriesForPatientByID', 'listAllSurgeriesForPatientByID', 'index.handler', undefined, {}, { functionName: 'akwadona-list-surgeries-by-patient' });
        const getSurgeryByIDFn = fn('GetSurgeryByID', 'getSurgeryByID', 'index.handler', undefined, {}, { functionName: 'akwadona-get-surgery-by-id' });
        const getAllDepartmentsFn = fn('GetAllDepartments', 'getAllDepartments', 'index.handler', undefined, {}, { functionName: 'akwadona-get-all-departments' });
        const createNewDepartmentFn = fn('CreateNewDepartment', 'createNewDepartment', 'index.handler', undefined, {}, { functionName: 'akwadona-create-department' });
        const bulkCreateDepartmentsFn = fn('BulkCreateDepartments', 'bulkCreateDepartments', 'index.handler', undefined, {}, { functionName: 'akwadona-bulk-create-departments' });
        const deleteAllDepartmentsFn = fn('DeleteAllDepartments', 'deleteAllDepartments', 'index.handler', undefined, {}, { functionName: 'akwadona-delete-all-departments' });
        const getAllSpecializationsFn = fn('GetAllSpecializations', 'getAllSpecializations', 'index.handler', undefined, {}, { functionName: 'akwadona-get-all-specializations' });
        const createNewSpecializationFn = fn('CreateNewSpecialization', 'createNewSpecialization', 'index.handler', undefined, {}, { functionName: 'akwadona-create-specialization' });
        const bulkCreateSpecializationsFn = fn('BulkCreateSpecializations', 'bulkCreateSpecializations', 'index.handler', undefined, {}, { functionName: 'akwadona-bulk-create-specializations' });
        const deleteAllSpecializationsFn = fn('DeleteAllSpecializations', 'deleteAllSpecializations', 'index.handler', undefined, {}, { functionName: 'akwadona-delete-all-specializations' });
        // Step 8 — deployed as `akwadona-admin-panel`.
        const adminPanelFn = fn('AkwadonaAdminPanel', 'akwadona-admin-panel', 'index.handler', lambda.Runtime.NODEJS_20_X, {}, { functionName: 'akwadona-admin-panel' });
        // Step 7 — Operator console backend.
        // Read-mostly Lambda that surfaces tenant metadata, counts, and
        // audit metadata to the operator UI at www.akwadona.com. By
        // convention it never calls KMS Decrypt on tenant data — see the
        // top-of-file comment in akwadona-operator-console/index.js.
        // Step 8 — deployed as `akwadona-operator-console`.
        // API_ID + CLOUDFRONT_DISTRIBUTION_ID are wired via addEnvironment
        // further down (once `api` and `distribution` are constructed).
        const operatorConsoleFn = fn('AkwadonaOperatorConsole', 'akwadona-operator-console', 'index.handler', lambda.Runtime.NODEJS_20_X, {
            USER_POOL_ID: userPool.userPoolId
        }, { functionName: 'akwadona-operator-console' });
        // Step 7g — platform-admin metrics need CloudWatch + Cognito list access.
        // Read-only — no business data.
        operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['cloudwatch:GetMetricData', 'cloudwatch:GetMetricStatistics'],
            resources: ['*']
        }));
        operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['cognito-idp:ListUsersInGroup'],
            resources: [userPool.userPoolArn]
        }));
        // ─────────────────────────────────────────────────────────────────────
        // Step 9 — Hardened operator IAM (zero-knowledge defense-in-depth).
        //
        // An explicit DENY on every tenant CMK guarantees the operator
        // Lambda can NEVER decrypt, encrypt, derive a data key, or compute
        // HMACs against patient data — even if a future code change
        // accidentally grants kms:* on '*', or a key-policy update opens
        // the door. In IAM evaluation, an explicit DENY always overrides
        // any ALLOW (whether identity-based, resource-based, or session-
        // policy-based). This is the technical proof of our public claim:
        //   "Akwadona platform staff cannot read patient data."
        //
        // Onboarding: each new tenant entry in `tenantKeys` / `tenantHmacKeys`
        // is automatically picked up by Object.values() below — no manual
        // sync required.
        // ─────────────────────────────────────────────────────────────────────
        const allTenantCmkArns = [
            ...Object.values(tenantKeys),
            ...Object.values(tenantHmacKeys)
        ];
        // Only add the DENY when there are hardcoded tenant CMKs. Wizard-
        // onboarded tenants get their DENY the same way — via a wildcard on
        // `alias/akwadona-tenant-*` in a second statement below.
        if (allTenantCmkArns.length > 0) {
            operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: [
                    'kms:Decrypt',
                    'kms:Encrypt',
                    'kms:GenerateDataKey',
                    'kms:GenerateDataKey*',
                    'kms:GenerateDataKeyWithoutPlaintext',
                    'kms:GenerateMac',
                    'kms:VerifyMac',
                    'kms:ReEncrypt*'
                ],
                resources: allTenantCmkArns
            }));
        }
        // Wildcard DENY for any current + future wizard-created tenant CMKs.
        // The resource-based key policy on each CMK already excludes the operator
        // role via StringNotLike; this identity-side DENY is defense in depth.
        operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: [
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:GenerateDataKey',
                'kms:GenerateDataKey*',
                'kms:GenerateDataKeyWithoutPlaintext',
                'kms:GenerateMac',
                'kms:VerifyMac',
                'kms:ReEncrypt*'
            ],
            resources: [`arn:aws:kms:${region}:${accountId}:key/*`],
            conditions: {
                'ForAnyValue:StringLike': {
                    'kms:ResourceAliases': 'alias/akwadona-tenant-*'
                }
            }
        }));
        // ─────────────────────────────────────────────────────────────────────
        // Step 96 — Tenant onboarding wizard IAM grants.
        //
        // Operator can:
        //   - Create new KMS CMKs and aliases for new tenants. Cannot scope
        //     CreateKey/CreateAlias to specific resources because at creation
        //     time the resource doesn't exist yet — restrictions go on tags
        //     and aliases below.
        //   - Schedule deletion ONLY for keys that carry the akwadona:tenantId
        //     tag (the wizard tags every key it creates). Protects pre-existing
        //     Akwadona / Alshifaa CMKs from accidental deletion.
        //   - Tag resources whose alias matches alias/akwadona-tenant-*.
        //   - Create / set-password / group-add / delete Cognito users in this
        //     pool. AdminDeleteUser is needed for rollback when onboarding
        //     fails mid-flight.
        //
        // The new tenant CMK key-policy template (built inline in the wizard
        // Lambda) excludes operator-* roles, so the operator still cannot
        // decrypt the new tenant's data once provisioned — same zero-knowledge
        // guarantee as Akwadona and Alshifaa.
        // ─────────────────────────────────────────────────────────────────────
        operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'kms:CreateKey',
                'kms:CreateAlias'
            ],
            resources: ['*']
        }));
        operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['kms:TagResource', 'kms:ScheduleKeyDeletion', 'kms:DescribeKey'],
            resources: ['*']
        }));
        // Defense-in-depth — operator may never delete pre-existing tenant
        // CMKs, only the new keys it just created. Explicit DENY overrides
        // the broad ScheduleKeyDeletion grant above.
        if (allTenantCmkArns.length > 0) {
            operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: ['kms:ScheduleKeyDeletion', 'kms:DeleteAlias'],
                resources: allTenantCmkArns
            }));
        }
        operatorConsoleFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminAddUserToGroup',
                'cognito-idp:AdminRemoveUserFromGroup',
                'cognito-idp:AdminDeleteUser',
                // Step 106 - user management UI.
                'cognito-idp:ListUsers',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminDisableUser',
                'cognito-idp:AdminEnableUser',
                'cognito-idp:AdminListGroupsForUser'
            ],
            resources: [userPool.userPoolArn]
        }));
        // Step 8 — deployed as `akwadona-examinations`.
        const examinationsFn = fn('AkwadonaExaminations', 'akwadona-examinations', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-examinations' });
        // Step 8 — deployed as `akwadona-pharmacy`; source folder kept for diff minimality.
        const pharmacyFn = fn('AkwadonaPharmacy', 'akwadona-pharmacy', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-pharmacy' });
        // Step 8 — deployed as `akwadona-document-manager`.
        const documentManagerFn = fn('AkwadonaDocumentManager', 'akwadona-document-manager', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-document-manager' });
        // Step 8 — deployed as `akwadona-audit`.
        const auditFn = fn('AkwadonaAudit', 'akwadona-audit', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-audit' });
        // Step 8 — deployed as `akwadona-appointments`.
        const appointmentsFn = fn('AkwadonaAppointments', 'akwadona-appointments', 'index.handler', lambda.Runtime.NODEJS_24_X, {}, { functionName: 'akwadona-appointments' });
        // Hospital calendar — replaces the previous external CalendarPlatform SaaS.
        // All calendar data now persists in the Hospital DynamoDB table for
        // PDPPL data-residency + clinical-privacy compliance.
        // Step 8 — deployed as `akwadona-calendar`.
        const calendarFn = fn('AkwadonaCalendar', 'akwadona-calendar', 'index.handler', lambda.Runtime.NODEJS_20_X, {}, { functionName: 'akwadona-calendar' });
        // Blood Bank module — donors / donations / inventory / requests / crossmatch / issue.
        // Step 8 — deployed as `akwadona-bloodbank`.
        const bloodbankFn = fn('AkwadonaBloodbank', 'akwadona-bloodbank', 'index.handler', lambda.Runtime.NODEJS_20_X, {}, { functionName: 'akwadona-bloodbank' });

        // ─────────────────────────────────────────────────────────────────────
        // ScribeFirst Phase 1 — SOAP generation Lambda.
        // Calls Bedrock for transcript → SOAP split; writes session + audit
        // rows to the existing single-table.
        // BEDROCK_REGION can differ from AWS_REGION when Bedrock isn't yet
        // available in the data-plane region (e.g. me-south-1 production).
        // ─────────────────────────────────────────────────────────────────────
        // Step 8 — deployed as `akwadona-scribe`.
        const scribeFn = fn(
            'AkwadonaScribe',
            'akwadona-scribe',
            'index.handler',
            lambda.Runtime.NODEJS_20_X,
            {
                BEDROCK_REGION: 'us-east-1',
                // Claude 3.5 Haiku via the US cross-region inference profile.
                // The original claude-3-haiku-20240307 model was retired/marked
                // legacy by the provider, which caused InvokeModel AccessDenied.
                // Newer Anthropic models on Bedrock are only invokable through an
                // inference profile (the "us." prefix), not the bare model ID.
                BEDROCK_MODEL_ID: 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
            },
            { functionName: 'akwadona-scribe' }
        );
        // Allow Bedrock InvokeModel on the Claude 3.5 Haiku US inference profile.
        // A cross-region inference profile requires permission on BOTH the
        // profile ARN and the underlying foundation-model ARNs in every region
        // the profile can route to (us-east-1 / us-east-2 / us-west-2).
        scribeFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['bedrock:InvokeModel'],
                resources: [
                    `arn:aws:bedrock:us-east-1:${this.account}:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0`,
                    'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
                    'arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
                    'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0'
                ]
            })
        );

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

        // Step 2g.5 — single managed policy shared across every tenant Lambda
        // for publishing the throttle 429 metric. Using a ManagedPolicy here
        // (1 CFN resource) instead of one inline statement per Lambda (would
        // be 40 resources) — keeps us under the 500-resource ceiling.
        const throttleMetricsPolicy = new iam.ManagedPolicy(this, 'AkwadonaThrottleMetricsPolicy', {
            managedPolicyName: 'akwadona-throttle-metrics',
            statements: [new iam.PolicyStatement({
                actions: ['cloudwatch:PutMetricData'],
                resources: ['*'],
                conditions: { StringEquals: { 'cloudwatch:namespace': 'Akwadona/Throttle' } }
            })]
        });

        allFunctions.forEach((f) => {
            table.grantReadWriteData(f);
            // Compliance: Lambda execution roles must be explicitly granted
            // KMS Encrypt/Decrypt on the data CMK because DynamoDB CUSTOMER_MANAGED
            // encryption requires the caller principal to have key access.
            akwadonaDataKey.grantEncryptDecrypt(f);
            // Step 2g.5 — attach the shared managed policy (no per-Lambda
            // policy resource gets created).
            f.role?.addManagedPolicy(throttleMetricsPolicy);
        });

        // Step 7 cleanup — EventBridge warmer removed to free CFN resources
        // for the operator console. At our traffic levels Lambda containers
        // stay warm naturally, and the warmer's 6 resources (1 rule + 5
        // Lambda permissions) were eating into our 500-resource budget.
        // The Lambdas still short-circuit on `_warmup` events so any future
        // re-introduction (or external pinger) works without code change.

        // Seed Lambda also writes to the encrypted table.
        // (granted further down where seedFn is defined.)

        adminPanelFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'cognito-idp:ListUsers',
                    'cognito-idp:ListUsersInGroup',
                    'cognito-idp:AdminDisableUser',
                    'cognito-idp:AdminEnableUser',
                    'cognito-idp:AdminSetUserPassword',
                    // Step C.5 — admin can change a user's email attribute.
                    'cognito-idp:AdminUpdateUserAttributes'
                ],
                resources: [userPool.userPoolArn]
            })
        );
        // Step C.5 — admin-panel needs KMS:GenerateMac on every tenant's HMAC
        // key so it can refresh the emailHash search index after an email change.
        Object.values(tenantHmacKeys).forEach(arn => {
            adminPanelFn.addToRolePolicy(new iam.PolicyStatement({
                actions: ['kms:GenerateMac'],
                resources: [arn]
            }));
        });

        // Documents bucket access is granted on the bucket construct below
        // (see AkwadonaDocumentsBucket), so no cross-account inline policy here.

        // ─────────────────────────────────────────────────────────────────────
        // Seed Lambda — departments, specializations, counters
        // ─────────────────────────────────────────────────────────────────────
        const seedFn = new lambda.Function(this, 'AkwadonaSeedFunction', {
            functionName: 'akwadona-seed',
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
        akwadonaDataKey.grantEncryptDecrypt(seedFn);
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
        //     /akwadona/seed-users/<username>, encrypted with the data CMK,
        //   - never logged, never returned to the API caller.
        // ─────────────────────────────────────────────────────────────────────
        const usersFn = new lambda.Function(this, 'AkwadonaUsersFunction', {
            functionName: 'akwadona-create-users',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(5),
            environment: {
                USER_POOL_ID: userPool.userPoolId,
                DATA_KMS_KEY_ID: akwadonaDataKey.keyId
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
    const name = '/akwadona/seed-users/' + username;
    try {
        await secrets.send(new CreateSecretCommand({
            Name: name,
            Description: 'Temporary password for seeded Akwadona user — must be changed on first login.',
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

        usersFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'cognito-idp:AdminCreateUser',
                    'cognito-idp:AdminAddUserToGroup'
                ],
                resources: [userPool.userPoolArn]
            })
        );

        usersFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'secretsmanager:CreateSecret',
                    'secretsmanager:PutSecretValue',
                    'secretsmanager:DescribeSecret'
                ],
                resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:/akwadona/seed-users/*`]
            })
        );

        // Lambda must be allowed to use the data CMK to encrypt the secret.
        akwadonaDataKey.grantEncryptDecrypt(usersFn);

        const usersProvider = new cr.Provider(this, 'UsersProvider', { onEventHandler: usersFn });
        new cdk.CustomResource(this, 'CreateUsers', {
            serviceToken: usersProvider.serviceToken,
            properties: { userPoolId: userPool.userPoolId }
        });

        // ─────────────────────────────────────────────────────────────────────
        // API Gateway + JWT Authorizer
        // ─────────────────────────────────────────────────────────────────────
        const authorizer = new HttpJwtAuthorizer('AkwadonaAuthorizer', `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`, {
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
        const api = new apigwv2.HttpApi(this, 'AkwadonaHttpApi', {
            apiName: 'akwadona-api',
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

        const route = (path: string, methods: apigwv2.HttpMethod[], handler: lambda.Function) =>
            api.addRoutes({
                path,
                methods,
                integration: new HttpLambdaIntegration(path.replace(/[^a-zA-Z0-9]/g, '') + methods.join(''), handler),
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
        // Step 2g.5 cleanup — admin-panel routes consolidated into a single
        // catch-all proxy to free CFN resources (was 7 routes + 1 integration =
        // 8 resources, now 4 routes + 1 integration = 5 resources, freeing 3).
        // The Lambda already dispatches via path.includes() / regex tests so
        // no code change is needed.
        api.addRoutes({
            path: '/admin/{proxy+}',
            methods: [
                apigwv2.HttpMethod.GET,
                apigwv2.HttpMethod.POST,
                apigwv2.HttpMethod.PATCH,
                apigwv2.HttpMethod.DELETE
            ],
            integration: new HttpLambdaIntegration('AdminPanelProxy', adminPanelFn),
            authorizer
        });

        // Step 7 — Operator console: single catch-all route. We deliberately
        // use {proxy+} + ANY method to keep the resource count low (each
        // path × method = a CFN route resource; we were near the 500
        // ceiling). The Lambda parses the path itself. All requests still
        // pass through the JWT authorizer; the Lambda then checks
        // claims.role === 'operator'.
        api.addRoutes({
            path: '/operator/{proxy+}',
            // NOT ANY — including OPTIONS routes preflight through the JWT
            // authorizer, which 401s (browsers don't send Authorization on
            // preflight). With explicit methods, API Gateway HTTP API handles
            // OPTIONS itself using the corsPreflight config.
            methods: [
                apigwv2.HttpMethod.GET,
                apigwv2.HttpMethod.POST,
                apigwv2.HttpMethod.PATCH,
                apigwv2.HttpMethod.DELETE
            ],
            integration: new HttpLambdaIntegration('OperatorConsoleProxy', operatorConsoleFn),
            authorizer
        });
        route('/examinations', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], examinationsFn);
        route('/examinations/{examId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], examinationsFn);
        route('/examinations/{examId}/signoff', [apigwv2.HttpMethod.POST], examinationsFn);
        // Pharmacy routes — paths match the akwadona-pharmacy Lambda's internal router.
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
        // Document manager — paths match the akwadona-document-manager Lambda's
        // internal router and the Angular DocumentService calls.
        route('/documents/upload-url', [apigwv2.HttpMethod.POST], documentManagerFn);
        route('/documents/download-url', [apigwv2.HttpMethod.POST], documentManagerFn);
        route('/documents/list', [apigwv2.HttpMethod.GET], documentManagerFn);
        route('/documents/folders', [apigwv2.HttpMethod.GET], documentManagerFn);
        route('/documents/delete', [apigwv2.HttpMethod.DELETE], documentManagerFn);
        route('/audit', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], auditFn);
        route('/appointments', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], appointmentsFn);
        route('/appointments/{apptId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], appointmentsFn);

        // Hospital calendar routes — Akwadona-local, JWT-authenticated.
        route('/calendars', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], calendarFn);
        route('/calendars/{calendarId}', [apigwv2.HttpMethod.DELETE], calendarFn);
        route('/calendars/{calendarId}/events', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], calendarFn);
        route('/calendars/{calendarId}/events/{eventId}', [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], calendarFn);

        // Blood Bank module
        route('/bloodbank/donors',                                  [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],   bloodbankFn);
        route('/bloodbank/donors/{donorId}',                        [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], bloodbankFn);
        route('/bloodbank/donors/{donorId}/donations',              [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],   bloodbankFn);
        route('/bloodbank/donations',                               [apigwv2.HttpMethod.GET],                            bloodbankFn);
        route('/bloodbank/units',                                   [apigwv2.HttpMethod.GET],                            bloodbankFn);
        route('/bloodbank/units/{unitId}',                          [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], bloodbankFn);
        route('/bloodbank/stock',                                   [apigwv2.HttpMethod.GET],                            bloodbankFn);
        route('/bloodbank/requests',                                [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],   bloodbankFn);
        route('/bloodbank/requests/{requestId}',                    [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], bloodbankFn);
        route('/bloodbank/requests/{requestId}/crossmatch',         [apigwv2.HttpMethod.POST],                           bloodbankFn);
        route('/bloodbank/requests/{requestId}/issue',              [apigwv2.HttpMethod.POST],                           bloodbankFn);

        // ScribeFirst Phase 1 — SOAP scribe routes
        route('/scribe/sessions', [apigwv2.HttpMethod.POST], scribeFn);
        route('/scribe/sessions/{id}', [apigwv2.HttpMethod.GET], scribeFn);
        route('/scribe/sessions/{id}/soap', [apigwv2.HttpMethod.POST], scribeFn);
        route('/scribe/sessions/{id}/approve', [apigwv2.HttpMethod.POST], scribeFn);

        // ─────────────────────────────────────────────────────────────────────
        // S3 + CloudFront
        // ─────────────────────────────────────────────────────────────────────
        const siteBucket = new s3.Bucket(this, 'AkwadonaFrontendBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: akwadonaDataKey,
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

        const oac = new cloudfront.S3OriginAccessControl(this, 'AkwadonaOAC', {
            signing: cloudfront.Signing.SIGV4_NO_OVERRIDE
        });

        // Re-use the wildcard ACM cert already issued for akwadona.com + *.akwadona.com.
        // Cert lives in us-east-1 (CloudFront requirement). Covers www, tiryaq, alshifaa, etc.
        const siteCert = acm.Certificate.fromCertificateArn(
            this,
            'AkwadonaSiteCert',
            'arn:aws:acm:us-east-1:483176634665:certificate/c03903c3-12c3-46dd-9d63-4e40a72bb2be'
        );

        // ── Two-phase alias deploy (rebuild runbook) ─────────────────────────
        // After a full teardown, GoDaddy CNAMEs still point at the DESTROYED
        // CloudFront domain. CloudFront's anti-hijack check then rejects
        // attaching our aliases to the new distribution ("DNS record points to
        // another CloudFront distribution") and the whole stack rolls back.
        // Fix: deploy phase 1 WITHOUT aliases (cdk deploy -c skipAliases=1),
        // repoint GoDaddy at the fresh d*.cloudfront.net domain, then deploy
        // phase 2 normally to attach the aliases. recover.ps1 automates this.
        const skipAliases = !!this.node.tryGetContext('skipAliases');
        const distribution = new cloudfront.Distribution(this, 'AkwadonaDistribution', {
            ...(skipAliases ? {} : {
                domainNames: [
                    'akwadona.com',
                    'www.akwadona.com',
                    'tiryaq.akwadona.com',
                    'alshifaa.akwadona.com'
                ],
                certificate: siteCert
            }),
            defaultBehavior: {
                origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(siteBucket, {
                    originAccessControl: oac
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: CachePolicy.CACHING_OPTIMIZED,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS
            },
            defaultRootObject: 'index.html',
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            // Compliance regression: WAF temporarily disabled to stop charges.
            // Re-enable by setting webAclId back to props?.webAclArn and
            // re-instating the AkwadonaEdgeStack in bin/akwadona-cdk.ts.
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
            comment: 'Akwadona Hospital Platform'
        });

        // Now that `api` and `distribution` exist, wire their IDs into the
        // operator Lambda's env — used by the operator console for API +
        // CloudFront management calls.
        operatorConsoleFn.addEnvironment('API_ID', api.apiId);
        operatorConsoleFn.addEnvironment('CLOUDFRONT_DISTRIBUTION_ID', distribution.distributionId);

        siteBucket.addToResourcePolicy(
            new iam.PolicyStatement({
                actions: ['s3:GetObject'],
                resources: [`${siteBucket.bucketArn}/*`],
                principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
                conditions: {
                    StringEquals: {
                        'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${distribution.distributionId}`
                    }
                }
            })
        );

        // ─────────────────────────────────────────────────────────────────────
        // Documents bucket (owned by THIS account)
        // The old `akwadona-documents` name belongs to a different account, which
        // is why CORS could never be set. We create our own account-scoped
        // bucket and declare CORS as a property so browser→S3 pre-signed PUT/GET
        // uploads are allowed. The Lambda reads the name from DOCUMENTS_BUCKET.
        // ─────────────────────────────────────────────────────────────────────
        const documentsBucket = new s3.Bucket(this, 'AkwadonaDocumentsBucket', {
            bucketName: `akwadona-documents-${accountId}-${region}`,
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
        new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint, description: 'HTTP API URL → update src/app.config.ts apiBaseUrl' });
        new cdk.CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.distributionDomainName}`, description: 'Frontend URL → update callbackUrls + logoutUrls then redeploy' });
        new cdk.CfnOutput(this, 'S3BucketName', { value: siteBucket.bucketName, description: 'S3 bucket → ng build + aws s3 sync' });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId, description: 'Cognito User Pool ID → update app.config.ts authority' });
        new cdk.CfnOutput(this, 'AppClientId', { value: appClient.userPoolClientId, description: 'Cognito App Client ID → update app.config.ts clientId' });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId, description: 'CloudFront Distribution ID → cache invalidation' });
        new cdk.CfnOutput(this, 'CognitoAuthority', { value: `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`, description: 'Cognito authority URL → update app.config.ts' });
        new cdk.CfnOutput(this, 'DocumentsBucketName', { value: documentsBucket.bucketName, description: 'Documents bucket (uploads via pre-signed URLs)' });
    }
}
