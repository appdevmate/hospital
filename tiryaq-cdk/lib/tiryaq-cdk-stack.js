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
        // Shared Lambda environment + helper
        // ─────────────────────────────────────────────────────────────────────
        const sharedEnv = {
            TABLE_NAME: 'Hospital',
            USER_POOL_ID: userPool.userPoolId
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
        const warmTargets = [
            preTokenFn,
            appointmentsFn,
            getAllPatientsFn,
            getAllDoctorsFn,
            getAllInvoicesFn,
            examinationsFn,
            pharmacyFn,
            bloodbankFn
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
        const allowedOrigins = [
            'http://localhost:4200',
            'https://d6i7iwknkj0bg.cloudfront.net',
            'https://akwadona.com',
            'https://www.akwadona.com'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWNkay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpcnlhcS1jZGstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELHNFQUF3RDtBQUN4RCx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELDhFQUFnRTtBQU1oRSwrREFBK0Y7QUFDL0YsNkZBQWtGO0FBQ2xGLDJGQUE2RTtBQUc3RSxNQUFNLFdBQVcsR0FBRztJQUNoQixvQkFBb0I7SUFDcEIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1oseUJBQXlCO0lBQ3pCLFlBQVk7SUFDWixXQUFXO0lBQ1gsYUFBYTtJQUNiLFdBQVc7SUFDWCxXQUFXO0lBQ1gsZ0JBQWdCO0lBQ2hCLFlBQVk7SUFDWixhQUFhO0lBQ2IsZUFBZTtJQUNmLHlCQUF5QjtJQUN6QixTQUFTO0lBQ1QsVUFBVTtJQUNWLFlBQVk7SUFDWixhQUFhO0lBQ2Isa0JBQWtCO0lBQ2xCLGVBQWU7SUFDZixjQUFjO0lBQ2Qsb0JBQW9CO0lBQ3BCLFlBQVk7SUFDWixvQ0FBb0M7SUFDcEMsVUFBVTtJQUNWLFNBQVM7SUFDVCxnQkFBZ0I7Q0FDbkIsQ0FBQztBQUVGLE1BQU0sZUFBZSxHQUFHO0lBQ3BCLG1DQUFtQztJQUNuQyxZQUFZO0lBQ1osa0JBQWtCO0lBQ2xCLDBCQUEwQjtJQUMxQixZQUFZO0lBQ1osb0NBQW9DO0lBQ3BDLGNBQWM7SUFDZCxZQUFZO0lBQ1osb0JBQW9CO0lBQ3BCLG9CQUFvQjtJQUNwQixpQkFBaUI7SUFDakIsd0JBQXdCO0lBQ3hCLGNBQWM7SUFDZCxvQkFBb0I7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QUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSx1REFBdUQsRUFBRSxDQUFDLENBQUM7UUFDNUksSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSx1REFBdUQsRUFBRSxDQUFDLENBQUM7UUFDcEosSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsY0FBYyxFQUFFLFdBQVcsRUFBRSxpREFBaUQsRUFBRSxDQUFDLENBQUM7UUFDbEosSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEtBQUssRUFBRSx1QkFBdUIsTUFBTSxrQkFBa0IsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRSxDQUFDLENBQUM7UUFDMUwsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRSxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxnREFBZ0QsRUFBRSxDQUFDLENBQUM7SUFDekosQ0FBQztDQUNKO0FBdjlCRCxrQ0F1OUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ3d2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnRPcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcclxuaW1wb3J0ICogYXMgY2xvdWR0cmFpbCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR0cmFpbCc7XHJcbmltcG9ydCAqIGFzIGNyIGZyb20gJ2F3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXMnO1xyXG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XHJcbmltcG9ydCAqIGFzIGV2ZW50c1RhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGlyeWFxU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICAgIC8qKiBBUk4gb2YgdGhlIENsb3VkRnJvbnQtc2NvcGVkIFdBRnYyIFdlYkFDTCBjcmVhdGVkIGluIHRoZSBlZGdlICh1cy1lYXN0LTEpIHN0YWNrLiAqL1xyXG4gICAgd2ViQWNsQXJuPzogc3RyaW5nO1xyXG59XHJcbmltcG9ydCB7IFZpZXdlclByb3RvY29sUG9saWN5LCBBbGxvd2VkTWV0aG9kcywgQ2FjaGVQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCB7IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0IHsgSHR0cEp3dEF1dGhvcml6ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5jb25zdCBERVBBUlRNRU5UUyA9IFtcclxuICAgICdFbWVyZ2VuY3kgTWVkaWNpbmUnLFxyXG4gICAgJ0ludGVybmFsIE1lZGljaW5lJyxcclxuICAgICdHZW5lcmFsIFN1cmdlcnknLFxyXG4gICAgJ1BlZGlhdHJpY3MnLFxyXG4gICAgJ09ic3RldHJpY3MgJiBHeW5lY29sb2d5JyxcclxuICAgICdDYXJkaW9sb2d5JyxcclxuICAgICdOZXVyb2xvZ3knLFxyXG4gICAgJ09ydGhvcGVkaWNzJyxcclxuICAgICdSYWRpb2xvZ3knLFxyXG4gICAgJ1BhdGhvbG9neScsXHJcbiAgICAnQW5lc3RoZXNpb2xvZ3knLFxyXG4gICAgJ1BzeWNoaWF0cnknLFxyXG4gICAgJ0Rlcm1hdG9sb2d5JyxcclxuICAgICdPcGh0aGFsbW9sb2d5JyxcclxuICAgICdFYXIgTm9zZSAmIFRocm9hdCAoRU5UKScsXHJcbiAgICAnVXJvbG9neScsXHJcbiAgICAnT25jb2xvZ3knLFxyXG4gICAgJ05lcGhyb2xvZ3knLFxyXG4gICAgJ1B1bG1vbm9sb2d5JyxcclxuICAgICdHYXN0cm9lbnRlcm9sb2d5JyxcclxuICAgICdFbmRvY3Jpbm9sb2d5JyxcclxuICAgICdSaGV1bWF0b2xvZ3knLFxyXG4gICAgJ0luZmVjdGlvdXMgRGlzZWFzZScsXHJcbiAgICAnSGVtYXRvbG9neScsXHJcbiAgICAnUGh5c2ljYWwgTWVkaWNpbmUgJiBSZWhhYmlsaXRhdGlvbicsXHJcbiAgICAnUGhhcm1hY3knLFxyXG4gICAgJ051cnNpbmcnLFxyXG4gICAgJ0FkbWluaXN0cmF0aW9uJ1xyXG5dO1xyXG5cclxuY29uc3QgU1BFQ0lBTElaQVRJT05TID0gW1xyXG4gICAgJ0dlbmVyYWwgKEFkdWx0KSBJbnRlcm5hbCBNZWRpY2luZScsXHJcbiAgICAnQ2FyZGlvbG9neScsXHJcbiAgICAnR2FzdHJvZW50ZXJvbG9neScsXHJcbiAgICAnRW5kb2NyaW5vbG9neSAmIERpYWJldGVzJyxcclxuICAgICdOZXBocm9sb2d5JyxcclxuICAgICdQdWxtb25vbG9neSAmIFJlc3BpcmF0b3J5IE1lZGljaW5lJyxcclxuICAgICdSaGV1bWF0b2xvZ3knLFxyXG4gICAgJ0hlbWF0b2xvZ3knLFxyXG4gICAgJ0luZmVjdGlvdXMgRGlzZWFzZScsXHJcbiAgICAnR2VyaWF0cmljIE1lZGljaW5lJyxcclxuICAgICdHZW5lcmFsIFN1cmdlcnknLFxyXG4gICAgJ0NhcmRpb3Rob3JhY2ljIFN1cmdlcnknLFxyXG4gICAgJ05ldXJvc3VyZ2VyeScsXHJcbiAgICAnT3J0aG9wZWRpYyBTdXJnZXJ5JyxcclxuICAgICdQbGFzdGljICYgUmVjb25zdHJ1Y3RpdmUgU3VyZ2VyeScsXHJcbiAgICAnVmFzY3VsYXIgU3VyZ2VyeScsXHJcbiAgICAnUGVkaWF0cmljIFN1cmdlcnknLFxyXG4gICAgJ1Vyb2xvZ2ljYWwgU3VyZ2VyeScsXHJcbiAgICAnRW1lcmdlbmN5IE1lZGljaW5lJyxcclxuICAgICdDcml0aWNhbCBDYXJlIE1lZGljaW5lJyxcclxuICAgICdUcmF1bWEgU3VyZ2VyeScsXHJcbiAgICAnR2VuZXJhbCBQZWRpYXRyaWNzJyxcclxuICAgICdOZW9uYXRvbG9neScsXHJcbiAgICAnUGVkaWF0cmljIENhcmRpb2xvZ3knLFxyXG4gICAgJ1BlZGlhdHJpYyBOZXVyb2xvZ3knLFxyXG4gICAgJ1BlZGlhdHJpYyBPbmNvbG9neScsXHJcbiAgICAnT2JzdGV0cmljcyAmIEd5bmVjb2xvZ3knLFxyXG4gICAgJ01hdGVybmFsLUZldGFsIE1lZGljaW5lJyxcclxuICAgICdHeW5lY29sb2dpYyBPbmNvbG9neScsXHJcbiAgICAnTmV1cm9sb2d5JyxcclxuICAgICdQc3ljaGlhdHJ5JyxcclxuICAgICdDbGluaWNhbCBOZXVyb3BoeXNpb2xvZ3knLFxyXG4gICAgJ1JhZGlvbG9neSAmIE1lZGljYWwgSW1hZ2luZycsXHJcbiAgICAnTnVjbGVhciBNZWRpY2luZScsXHJcbiAgICAnUGF0aG9sb2d5ICYgTGFib3JhdG9yeSBNZWRpY2luZScsXHJcbiAgICAnT3BodGhhbG1vbG9neScsXHJcbiAgICAnT3RvbGFyeW5nb2xvZ3kgKEVOVCknLFxyXG4gICAgJ0Rlcm1hdG9sb2d5JyxcclxuICAgICdTcG9ydHMgTWVkaWNpbmUnLFxyXG4gICAgJ01lZGljYWwgT25jb2xvZ3knLFxyXG4gICAgJ1JhZGlhdGlvbiBPbmNvbG9neScsXHJcbiAgICAnQW5lc3RoZXNpb2xvZ3knLFxyXG4gICAgJ1BhaW4gTWVkaWNpbmUnLFxyXG4gICAgJ1BhbGxpYXRpdmUgQ2FyZScsXHJcbiAgICAnRmFtaWx5IE1lZGljaW5lJyxcclxuICAgICdPY2N1cGF0aW9uYWwgTWVkaWNpbmUnLFxyXG4gICAgJ1B1YmxpYyBIZWFsdGgnXHJcbl07XHJcblxyXG5leHBvcnQgY2xhc3MgVGlyeWFxU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBUaXJ5YXFTdGFja1Byb3BzKSB7XHJcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFjY291bnRJZCA9IGNkay5TdGFjay5vZih0aGlzKS5hY2NvdW50O1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IGNkay5TdGFjay5vZih0aGlzKS5yZWdpb247XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIEFydC4gOSDigJQgZW5jcnlwdGlvbiBhdCByZXN0IHdpdGggY3VzdG9tZXIgY29udHJvbC5cclxuICAgICAgICAvLyBUd28gQ01LczpcclxuICAgICAgICAvLyAgIC0gdGlyeWFxRGF0YUtleSAg4oaSIGVuY3J5cHRzIER5bmFtb0RCIGFuZCB0aGUgZnJvbnRlbmQgUzMgYnVja2V0XHJcbiAgICAgICAgLy8gICAtIHRpcnlhcUF1ZGl0S2V5IOKGkiBlbmNyeXB0cyB0aGUgYXVkaXQgbG9nIGJ1Y2tldCAoc2VwYXJhdGVkIHNvXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcGxhbmUga2V5IGNvbXByb21pc2UgZG9lcyBub3QgaW52YWxpZGF0ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICB0aGUgYXVkaXQgY2hhaW4pXHJcbiAgICAgICAgLy8gQW5udWFsIGF1dG9tYXRpYyByb3RhdGlvbjsga2V5IGFkbWlucyBsaW1pdGVkIHRvIHRoZSBkZXBsb3lpbmdcclxuICAgICAgICAvLyBwcmluY2lwYWw7IHVzYWdlIGxpbWl0ZWQgdG8gc3BlY2lmaWMgQVdTIHNlcnZpY2VzIGluIHRoaXMgYWNjb3VudC5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0aXJ5YXFEYXRhS2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1RpcnlhcURhdGFLZXknLCB7XHJcbiAgICAgICAgICAgIGFsaWFzOiAnYWxpYXMvdGlyeWFxL2RhdGEnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NNSyBmb3IgVGlyeWFxIER5bmFtb0RCIGFuZCBmcm9udGVuZCBidWNrZXQg4oCUIFBEUFBMIEFydC4gOS4nLFxyXG4gICAgICAgICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBwZW5kaW5nV2luZG93OiBjZGsuRHVyYXRpb24uZGF5cygzMClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgdGlyeWFxQXVkaXRLZXkgPSBuZXcga21zLktleSh0aGlzLCAnVGlyeWFxQXVkaXRLZXknLCB7XHJcbiAgICAgICAgICAgIGFsaWFzOiAnYWxpYXMvdGlyeWFxL2F1ZGl0JyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDTUsgZm9yIFRpcnlhcSBhdWRpdCBsb2cgYnVja2V0IGFuZCBDbG91ZFRyYWlsIOKAlCBzZWdyZWdhdGVkIGZyb20gZGF0YSBrZXkuJyxcclxuICAgICAgICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgcGVuZGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENsb3VkVHJhaWwgKHRoZSBBV1Mgc2VydmljZSkgbmVlZHMgcGVybWlzc2lvbiB0byB1c2UgdGhlIGF1ZGl0IENNS1xyXG4gICAgICAgIC8vIHdoZW4gaXQgd3JpdGVzIGVuY3J5cHRlZCBsb2cgZmlsZXMgaW50byB0aGUgYXVkaXQgYnVja2V0LlxyXG4gICAgICAgIHRpcnlhcUF1ZGl0S2V5LmFkZFRvUmVzb3VyY2VQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIHNpZDogJ0FsbG93Q2xvdWRUcmFpbEVuY3J5cHRMb2dzJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsna21zOkdlbmVyYXRlRGF0YUtleSonLCAna21zOkRlc2NyaWJlS2V5J10sXHJcbiAgICAgICAgICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjbG91ZHRyYWlsLmFtYXpvbmF3cy5jb20nKV0sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0cmluZ0VxdWFsczogeyAnYXdzOlNvdXJjZUFjY291bnQnOiBjZGsuQXdzLkFDQ09VTlRfSUQgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IHNlcGFyYXRlIFwic2VydmljZSBhY2Nlc3MgbG9nc1wiIGJ1Y2tldC5cclxuICAgICAgICAvLyBTMyBzZXJ2ZXIgYWNjZXNzIGxvZ2dpbmcgYW5kIENsb3VkRnJvbnQgc3RhbmRhcmQgbG9nZ2luZyBib3RoXHJcbiAgICAgICAgLy8gcmVmdXNlIFNTRS1LTVMgZGVzdGluYXRpb24gYnVja2V0cywgc28gd2Uga2VlcCB0aGVzZSBBV1Mtc2VydmljZVxyXG4gICAgICAgIC8vIGxvZ3MgaW4gYSBkZWRpY2F0ZWQgYnVja2V0IHdpdGggU1NFLVMzICsgdmVyc2lvbmluZyArIGxpZmVjeWNsZS5cclxuICAgICAgICAvLyBUaGUgaGlnaC1hc3N1cmFuY2UgKENNSyArIE9iamVjdCBMb2NrKSBidWNrZXQgYmVsb3cgaG9sZHNcclxuICAgICAgICAvLyBDbG91ZFRyYWlsIGFuZCBleHBvcnRlZCBhcHBsaWNhdGlvbiBhdWRpdCBvbmx5LlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGFjY2Vzc0xvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFBY2Nlc3NMb2dzQnVja2V0Jywge1xyXG4gICAgICAgICAgICBidWNrZXROYW1lOiBgdGlyeWFxLWFjY2Vzcy1sb2dzLSR7YWNjb3VudElkfS0ke3JlZ2lvbn1gLFxyXG4gICAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgICAgICAgb2JqZWN0T3duZXJzaGlwOiBzMy5PYmplY3RPd25lcnNoaXAuQlVDS0VUX09XTkVSX1BSRUZFUlJFRCxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndHJhbnNpdGlvbi1hbmQtZXhwaXJlJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUiwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCkgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMjU1NSkgLy8gNyB5ZWFyc1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIEFydC4gOSArIE1PUEggYXVkaXQgdHJhaWwuXHJcbiAgICAgICAgLy8gSW1tdXRhYmxlIGF1ZGl0IGxvZyBidWNrZXQg4oCUIE9iamVjdCBMb2NrIGluIGNvbXBsaWFuY2UgbW9kZSBwcmV2ZW50c1xyXG4gICAgICAgIC8vIHRhbXBlcmluZyBvciBkZWxldGlvbiBvZiBhdWRpdCByZWNvcmRzLCBldmVuIGJ5IGFjY291bnQgYWRtaW5zLlxyXG4gICAgICAgIC8vIDcteWVhciByZXRlbnRpb24gYWxpZ25zIHdpdGggUWF0YXIgaGVhbHRoY2FyZSByZWNvcmQta2VlcGluZyBub3Jtcy5cclxuICAgICAgICAvLyBWZXJzaW9uaW5nIGlzIG1hbmRhdG9yeSBmb3IgT2JqZWN0IExvY2suXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgYXVkaXRCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFBdWRpdEJ1Y2tldCcsIHtcclxuICAgICAgICAgICAgYnVja2V0TmFtZTogYHRpcnlhcS1hdWRpdC0ke2FjY291bnRJZH0tJHtyZWdpb259YCxcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVMsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb25LZXk6IHRpcnlhcUF1ZGl0S2V5LFxyXG4gICAgICAgICAgICBidWNrZXRLZXlFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG9iamVjdExvY2tFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBvYmplY3RMb2NrRGVmYXVsdFJldGVudGlvbjogczMuT2JqZWN0TG9ja1JldGVudGlvbi5jb21wbGlhbmNlKGNkay5EdXJhdGlvbi5kYXlzKDI1NTUpKSwgLy8gNyB5ZWFyc1xyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd0cmFuc2l0aW9uLXRvLWdsYWNpZXInLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLCB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSB9XHJcbiAgICAgICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgICAgICBub25jdXJyZW50VmVyc2lvblRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuREVFUF9BUkNISVZFLCB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDE4MCkgfVxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCArIE5DU0EgTklBIOKAlCBpbmZyYXN0cnVjdHVyZS1sZXZlbCBhdWRpdC5cclxuICAgICAgICAvLyBNdWx0aS1yZWdpb24gdHJhaWwgd2l0aCBsb2cgZmlsZSB2YWxpZGF0aW9uLiBDYXB0dXJlcyBldmVyeSBBV1MgQVBJXHJcbiAgICAgICAgLy8gY2FsbCAoY29udHJvbCBwbGFuZSkuIFNlbnQgdG8gdGhlIGltbXV0YWJsZSBhdWRpdCBidWNrZXQgYWJvdmUuXHJcbiAgICAgICAgLy8gUzMgZGF0YSBldmVudHMgY2FwdHVyZWQgZm9yIHRoZSBmcm9udGVuZCBidWNrZXQgc28gd2UgY2FuIHByb3ZlXHJcbiAgICAgICAgLy8gd2hvIGRvd25sb2FkZWQgd2hhdCAoUEhJIGFjY2VzcyBwYXRoIHRocm91Z2ggcHJlLXNpZ25lZCBVUkxzKS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0cmFpbCA9IG5ldyBjbG91ZHRyYWlsLlRyYWlsKHRoaXMsICdUaXJ5YXFDbG91ZFRyYWlsJywge1xyXG4gICAgICAgICAgICB0cmFpbE5hbWU6ICd0aXJ5YXEtY2xvdWR0cmFpbCcsXHJcbiAgICAgICAgICAgIGJ1Y2tldDogYXVkaXRCdWNrZXQsXHJcbiAgICAgICAgICAgIHMzS2V5UHJlZml4OiAnY2xvdWR0cmFpbCcsXHJcbiAgICAgICAgICAgIGlzTXVsdGlSZWdpb25UcmFpbDogdHJ1ZSxcclxuICAgICAgICAgICAgaW5jbHVkZUdsb2JhbFNlcnZpY2VFdmVudHM6IHRydWUsXHJcbiAgICAgICAgICAgIGVuYWJsZUZpbGVWYWxpZGF0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICBzZW5kVG9DbG91ZFdhdGNoTG9nczogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaExvZ3NSZXRlbnRpb246IGNkay5hd3NfbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9ZRUFSLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFBdWRpdEtleVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBEeW5hbW9EQlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gSU1QT1JUQU5UIOKAlCBHU0kgREVQTE9ZTUVOVCBSVUxFOlxyXG4gICAgICAgIC8vIER5bmFtb0RCIG9ubHkgYWxsb3dzIE9ORSBHU0kgdG8gYmUgY3JlYXRlZCBwZXIgdGFibGUgdXBkYXRlLlxyXG4gICAgICAgIC8vIFRoaXMgbWVhbnMgb24gYSBGUkVTSCBkZXBsb3kgKG5ldyBhY2NvdW50KSwgYWxsIDcgR1NJcyB3aWxsIGJlXHJcbiAgICAgICAgLy8gY3JlYXRlZCBzdWNjZXNzZnVsbHkgYmVjYXVzZSBDREsgY3JlYXRlcyB0aGUgdGFibGUgKyBhbGwgR1NJc1xyXG4gICAgICAgIC8vIGluIHRoZSBpbml0aWFsIENSRUFURSBvcGVyYXRpb24gKG5vdCBhbiBVUERBVEUpLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gSG93ZXZlciBpZiB5b3UgYWRkIGEgTkVXIEdTSSB0byBhbiBleGlzdGluZyB0YWJsZSB2aWEgY2RrIGRlcGxveSxcclxuICAgICAgICAvLyB5b3UgTVVTVCBhZGQgb25seSBvbmUgYXQgYSB0aW1lIOKAlCBvdGhlcndpc2UgQ2xvdWRGb3JtYXRpb24gd2lsbFxyXG4gICAgICAgIC8vIGZhaWwgd2l0aCBcIkNhbm5vdCBwZXJmb3JtIG1vcmUgdGhhbiBvbmUgR1NJIGNyZWF0aW9uIG9yIGRlbGV0aW9uXHJcbiAgICAgICAgLy8gaW4gYSBzaW5nbGUgdXBkYXRlXCIuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBDdXJyZW50IEdTSXMgKGFsbCBjcmVhdGVkIG9uIGZyZXNoIGRlcGxveSk6XHJcbiAgICAgICAgLy8gICAxLiBFbnRpdHlUeXBlLWluZGV4ICAgICAgICAgIOKAlCBtYWluIHF1ZXJ5IGluZGV4XHJcbiAgICAgICAgLy8gICAyLiBQYXRpZW50SUQtaW5kZXggICAgICAgICAgIOKAlCBwYXRpZW50LXJlbGF0ZWQgcXVlcmllc1xyXG4gICAgICAgIC8vICAgMy4gZW1haWwtaW5kZXggICAgICAgICAgICAgICDigJQgbG9va3VwIGJ5IGVtYWlsXHJcbiAgICAgICAgLy8gICA0LiBkb2N0b3JFbWFpbC1jcmVhdGVkQXQtaW5kZXgg4oCUIGRvY3RvciBlbWFpbCArIGRhdGUgcXVlcmllc1xyXG4gICAgICAgIC8vICAgNS4gR1NJMSAgICAgICAgICAgICAgICAgICAgICDigJQgZ2VuZXJpYyBHU0kgKEdTSTFQSyArIEdTSTFTSylcclxuICAgICAgICAvLyAgIDYuIEdTSTIgICAgICAgICAgICAgICAgICAgICAg4oCUIG5hbWUgc2VhcmNoIChuYW1lX3ByZWZpeCArIG5hbWVfbG93ZXIpXHJcbiAgICAgICAgLy8gICA3LiBkYXRhQ2xhc3MtaW5kZXggICAgICAgICAgIOKAlCBQRFBQTCBicmVhY2ggc2NvcGluZyAoVXBkYXRlIDA2KVxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZSDigJQgZXZlcnkgaXRlbSB3cml0dGVuIHRvIHRoaXMgdGFibGUgU0hPVUxEIGluY2x1ZGUgYVxyXG4gICAgICAgIC8vIGBkYXRhQ2xhc3NgIGF0dHJpYnV0ZSBkcmF3biBmcm9tIHsgUEhJLCBQSUksIFBVQkxJQywgQVVESVQsIFNZU1RFTSB9XHJcbiAgICAgICAgLy8gYW5kIGFuIE9QVElPTkFMIGBleHBpcmVzQXRgIChlcG9jaCBzZWNvbmRzKSBhdHRyaWJ1dGUgdGhhdCBEeW5hbW9EQlxyXG4gICAgICAgIC8vIFRUTCB3aWxsIHVzZSB0byBhdXRvLXB1cmdlIHRyYW5zaWVudCByZWNvcmRzLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdIb3NwaXRhbFRhYmxlJywge1xyXG4gICAgICAgICAgICB0YWJsZU5hbWU6ICdIb3NwaXRhbCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHsgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHRydWUgfSxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkNVU1RPTUVSX01BTkFHRUQsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb25LZXk6IHRpcnlhcURhdGFLZXksXHJcbiAgICAgICAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdFbnRpdHlUeXBlLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdFbnRpdHlUeXBlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ1BhdGllbnRJRC1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncGF0aWVudElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZW1haWwtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnRW50aXR5VHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdkb2N0b3JFbWFpbC1jcmVhdGVkQXQtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2RvY3RvckVtYWlsJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ0dTSTEnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ0dTSTFQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0dTSTFTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdHU0kyJyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICduYW1lX3ByZWZpeCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ25hbWVfbG93ZXInLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIGJyZWFjaCBzY29waW5nICsgTkNTQSBOSUEgZGF0YSBjbGFzc2lmaWNhdGlvbi5cclxuICAgICAgICAvLyBMZXRzIHVzIGFuc3dlciBcInNob3cgbWUgZXZlcnkgUEhJIHJlY29yZCB0b3VjaGVkIGJldHdlZW4gdDEgYW5kIHQyXCJcclxuICAgICAgICAvLyB3aXRob3V0IGEgZnVsbCB0YWJsZSBzY2FuIGR1cmluZyBhIGZvcmVuc2ljIGludmVzdGlnYXRpb24uXHJcbiAgICAgICAgLy8gU29ydCBrZXkgPSB1cGRhdGVkQXQgc28gd2UgZ2V0IGl0ZW1zIGluIGNocm9ub2xvZ2ljYWwgb3JkZXIuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdkYXRhQ2xhc3MtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2RhdGFDbGFzcycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwZGF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5LRVlTX09OTFlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29nbml0byBVc2VyIFBvb2xcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkgKyBNT1BIIGFjY2Vzcy1jb250cm9sIGV4cGVjdGF0aW9ucy5cclxuICAgICAgICAvLyAtIFBhc3N3b3JkIHBvbGljeSBhbGlnbmVkIHdpdGggTkNTQSBOSUE6IDEyIGNoYXJzIG1pbiwgYWxsIGNsYXNzZXMuXHJcbiAgICAgICAgLy8gLSBUZW1wb3JhcnkgcGFzc3dvcmQgdmFsaWRpdHkgcmVkdWNlZCB0byAzIGRheXMgKGZvcmNlIHJvdGF0aW9uKS5cclxuICAgICAgICAvLyAtIE1GQSBSRVFVSVJFRCBmb3IgZXZlcnkgdXNlcjsgVE9UUCBwcmVmZXJyZWQsIFNNUyBmYWxsYmFjay5cclxuICAgICAgICAvLyAtIEFkdmFuY2VkIFNlY3VyaXR5IGF1ZGl0cyAoQ29nbml0byB0aHJlYXQgcHJvdGVjdGlvbikgZW5mb3JjZWQuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnVGlyeWFxVXNlclBvb2wnLCB7XHJcbiAgICAgICAgICAgIHVzZXJQb29sTmFtZTogJ3RpcnlhcS11c2VyLXBvb2wnLFxyXG4gICAgICAgICAgICBzZWxmU2lnblVwRW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIHNpZ25JbkFsaWFzZXM6IHsgdXNlcm5hbWU6IHRydWUsIGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUgfSxcclxuICAgICAgICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAgICAgICBlbWFpbDogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgZnVsbG5hbWU6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIGdlbmRlcjogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgcGhvbmVOdW1iZXI6IHsgcmVxdWlyZWQ6IGZhbHNlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBiaXJ0aGRhdGU6IHsgcmVxdWlyZWQ6IGZhbHNlLCBtdXRhYmxlOiB0cnVlIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICAgICAgICAgIG1pbkxlbmd0aDogMTIsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBDb21wbGlhbmNlIHJlZ3Jlc3Npb246IE1GQSBmdWxseSBkaXNhYmxlZCAoUkVRVUlSRUQgLT4gT1BUSU9OQUxcclxuICAgICAgICAgICAgLy8gLT4gT0ZGKSBieSByZXF1ZXN0LiBUaGUgdHdvLXN0ZXAgcGF0aCB3YXMgbmVlZGVkIGJlY2F1c2VcclxuICAgICAgICAgICAgLy8gQ29nbml0byByZWZ1c2VzIFJFUVVJUkVEIC0+IE9GRiBkaXJlY3RseSBvbiBhIGxpdmUgcG9vbC5cclxuICAgICAgICAgICAgLy8gUmUtZW5hYmxlIGJ5IHJlc3RvcmluZyBNZmEuUkVRVUlSRUQgYW5kIHJlLWRlcGxveWluZy5cclxuICAgICAgICAgICAgbWZhOiBjb2duaXRvLk1mYS5PRkYsXHJcbiAgICAgICAgICAgIC8vIG1mYVNlY29uZEZhY3RvciBub3QgbmVlZGVkIHdoZW4gbWZhIGlzIE9GRi5cclxuICAgICAgICAgICAgLy8gbWZhU2Vjb25kRmFjdG9yOiB7IHNtczogdHJ1ZSwgb3RwOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuICAgICAgICAgICAgc3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZTogY29nbml0by5TdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlLkZVTExfRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGRldmljZVRyYWNraW5nOiB7XHJcbiAgICAgICAgICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFwcENsaWVudCA9IHVzZXJQb29sLmFkZENsaWVudCgnVGlyeWFxQXBwQ2xpZW50Jywge1xyXG4gICAgICAgICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdUaXJ5YXEnLFxyXG4gICAgICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgICAgICAgIGF1dGhGbG93czoge1xyXG4gICAgICAgICAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXNlclNycDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGN1c3RvbTogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvQXV0aDoge1xyXG4gICAgICAgICAgICAgICAgZmxvd3M6IHsgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgc2NvcGVzOiBbY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCwgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLCBjb2duaXRvLk9BdXRoU2NvcGUuUEhPTkUsIGNvZ25pdG8uT0F1dGhTY29wZS5QUk9GSUxFXSxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrVXJsczogWydodHRwOi8vbG9jYWxob3N0OjQyMDAvJywgJ2h0dHBzOi8vZDZpN2l3a25rajBiZy5jbG91ZGZyb250Lm5ldC8nXSxcclxuICAgICAgICAgICAgICAgIGxvZ291dFVybHM6IFsnaHR0cDovL2xvY2FsaG9zdDo0MjAwLycsICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQvJ11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICBpZFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdXNlclBvb2wuYWRkRG9tYWluKCdUaXJ5YXFEb21haW4nLCB7XHJcbiAgICAgICAgICAgIGNvZ25pdG9Eb21haW46IHsgZG9tYWluUHJlZml4OiAndGlyeWFxLWhvc3BpdGFsJyB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIFsnQWRtaW4nLCAnRGV2ZWxvcGVycycsICdEb2N0b3JzJywgJ1BoYXJtYWNpc3RzJ10uZm9yRWFjaCgoZ3JvdXBOYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgYEdyb3VwJHtncm91cE5hbWV9YCwge1xyXG4gICAgICAgICAgICAgICAgdXNlclBvb2xJZDogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgIGdyb3VwTmFtZSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHtncm91cE5hbWV9IGdyb3VwYFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gUHJlIFRva2VuIEdlbmVyYXRpb24gTGFtYmRhXHJcbiAgICAgICAgLy8gSW5qZWN0cyBlbWFpbCArIG5hbWUgZnJvbSBDb2duaXRvIHVzZXIgYXR0cmlidXRlcyBpbnRvIHRoZVxyXG4gICAgICAgIC8vIEFjY2VzcyBUb2tlbiBjbGFpbXMgc28gYWxsIExhbWJkYSBmdW5jdGlvbnMgY2FuIGlkZW50aWZ5IHRoZSBhY3Rvci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBwcmVUb2tlbkZuID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ29nbml0b1ByZVRva2VuR2VuZXJhdGlvbicsIHtcclxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAnY29nbml0by1wcmUtdG9rZW4tZ2VuZXJhdGlvbicsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2NvZ25pdG8tcHJlLXRva2VuLWdlbmVyYXRpb24nKSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHByZVRva2VuRm4uYWRkUGVybWlzc2lvbignQ29nbml0b0ludm9rZScsIHtcclxuICAgICAgICAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2NvZ25pdG8taWRwLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICAgICAgc291cmNlQXJuOiB1c2VyUG9vbC51c2VyUG9vbEFyblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBjZm5Vc2VyUG9vbCA9IHVzZXJQb29sLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNvZ25pdG8uQ2ZuVXNlclBvb2w7XHJcbiAgICAgICAgY2ZuVXNlclBvb2wubGFtYmRhQ29uZmlnID0ge1xyXG4gICAgICAgICAgICBwcmVUb2tlbkdlbmVyYXRpb25Db25maWc6IHtcclxuICAgICAgICAgICAgICAgIGxhbWJkYUFybjogcHJlVG9rZW5Gbi5mdW5jdGlvbkFybixcclxuICAgICAgICAgICAgICAgIGxhbWJkYVZlcnNpb246ICdWM18wJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU2hhcmVkIExhbWJkYSBlbnZpcm9ubWVudCArIGhlbHBlclxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNoYXJlZEVudiA9IHtcclxuICAgICAgICAgICAgVEFCTEVfTkFNRTogJ0hvc3BpdGFsJyxcclxuICAgICAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gTGFtYmRhIGZhY3RvcnkuXHJcbiAgICAgICAgLy8gTWVtb3J5IGJ1bXBlZCB0byA1MTIgTUIgYnkgZGVmYXVsdCDigJQgTm9kZS5qcyBjb2xkLXN0YXJ0IHNjYWxlcyB3aXRoXHJcbiAgICAgICAgLy8gQ1BVIHdoaWNoIGlzIGFsbG9jYXRlZCBwcm9wb3J0aW9uYWxseSB0byBtZW1vcnk7IDUxMiBNQiByb3VnaGx5XHJcbiAgICAgICAgLy8gaGFsdmVzIGNvbGQtc3RhcnQgdGltZSB2cyB0aGUgZGVmYXVsdCAxMjggTUIgYW5kIGlzIHN0aWxsIHBlbm5pZXMvbW9udGguXHJcbiAgICAgICAgY29uc3QgZm4gPSAoaWQ6IHN0cmluZywgZm9sZGVyOiBzdHJpbmcsIGhhbmRsZXI6IHN0cmluZywgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUgPSBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCwgZXh0cmFFbnY6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fSwgb3B0czogeyBtZW1vcnlTaXplPzogbnVtYmVyIH0gPSB7fSkgPT5cclxuICAgICAgICAgICAgbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBpZCwge1xyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBmb2xkZXIsXHJcbiAgICAgICAgICAgICAgICBydW50aW1lLFxyXG4gICAgICAgICAgICAgICAgaGFuZGxlcixcclxuICAgICAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChgbGFtYmRhLyR7Zm9sZGVyfWApLFxyXG4gICAgICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHsgLi4uc2hhcmVkRW52LCAuLi5leHRyYUVudiB9LFxyXG4gICAgICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgICAgICAgICAgbWVtb3J5U2l6ZTogb3B0cy5tZW1vcnlTaXplID8/IDUxMlxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGdldEFsbFBhdGllbnRzRm4gPSBmbignR2V0QWxsUGF0aWVudHMnLCAnZ2V0QWxsUGF0aWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFBhdGllbnRCeUlERm4gPSBmbignR2V0UGF0aWVudEJ5SUQnLCAnZ2V0UGF0aWVudEJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZVBhdGllbnRGbiA9IGZuKCdDcmVhdGVQYXRpZW50JywgJ2NyZWF0ZVBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZVBhdGllbnRGbiA9IGZuKCdVcGRhdGVQYXRpZW50JywgJ3VwZGF0ZVBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZVBhdGllbnRGbiA9IGZuKCdEZWxldGVQYXRpZW50JywgJ2RlbGV0ZVBhdGllbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFBhdGllbnRzRGF0YUJ5RmlsdGVyc0ZuID0gZm4oJ0dldFBhdGllbnRzRGF0YUJ5RmlsdGVycycsICdnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbERvY3RvcnNGbiA9IGZuKCdHZXRBbGxEb2N0b3JzJywgJ2dldEFsbERvY3RvcnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldERvY3RvckJ5SURGbiA9IGZuKCdHZXREb2N0b3JCeUlEJywgJ2dldERvY3RvckJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldERvY3RvckJ5RW1haWxGbiA9IGZuKCdHZXREb2N0b3JCeUVtYWlsJywgJ2dldERvY3RvckJ5RW1haWwnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVEb2N0b3JGbiA9IGZuKCdDcmVhdGVEb2N0b3InLCAnY3JlYXRlRG9jdG9yJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCB1cGRhdGVEb2N0b3JGbiA9IGZuKCdVcGRhdGVEb2N0b3InLCAndXBkYXRlRG9jdG9yJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVEb2N0b3JGbiA9IGZuKCdEZWxldGVEb2N0b3InLCAnZGVsZXRlRG9jdG9yJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVQYXRpZW50UGF5bWVudEZuID0gZm4oJ0NyZWF0ZVBhdGllbnRQYXltZW50JywgJ2NyZWF0ZVBhdGllbnRQYXltZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxQYXltZW50c0ZvclBhdGllbnRGbiA9IGZuKCdHZXRBbGxQYXltZW50c0ZvclBhdGllbnQnLCAnZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJREZuID0gZm4oJ0xpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlEJywgJ2xpc3RBbGxQYXltZW50c0ZvclBhdGllbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCB1cGRhdGVQYXRpZW50UGF5bWVudEZuID0gZm4oJ1VwZGF0ZVBhdGllbnRQYXltZW50JywgJ3VwZGF0ZVBhdGllbnRQYXltZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRQYXltZW50QnlJREZuID0gZm4oJ0dldFBheW1lbnRCeUlEJywgJ2dldFBheW1lbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVQYXltZW50Rm4gPSBmbignRGVsZXRlUGF5bWVudCcsICdkZWxldGVQYXltZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxJbnZvaWNlc0ZuID0gZm4oJ0dldEFsbEludm9pY2VzJywgJ2dldEFsbEludm9pY2VzJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlUGF0aWVudFN1cmdlcnlGbiA9IGZuKCdDcmVhdGVQYXRpZW50U3VyZ2VyeScsICdjcmVhdGVQYXRpZW50U3VyZ2VyeScsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgbGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlERm4gPSBmbignTGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlEJywgJ2xpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0U3VyZ2VyeUJ5SURGbiA9IGZuKCdHZXRTdXJnZXJ5QnlJRCcsICdnZXRTdXJnZXJ5QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsRGVwYXJ0bWVudHNGbiA9IGZuKCdHZXRBbGxEZXBhcnRtZW50cycsICdnZXRBbGxEZXBhcnRtZW50cycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlTmV3RGVwYXJ0bWVudEZuID0gZm4oJ0NyZWF0ZU5ld0RlcGFydG1lbnQnLCAnY3JlYXRlTmV3RGVwYXJ0bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgYnVsa0NyZWF0ZURlcGFydG1lbnRzRm4gPSBmbignQnVsa0NyZWF0ZURlcGFydG1lbnRzJywgJ2J1bGtDcmVhdGVEZXBhcnRtZW50cycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlQWxsRGVwYXJ0bWVudHNGbiA9IGZuKCdEZWxldGVBbGxEZXBhcnRtZW50cycsICdkZWxldGVBbGxEZXBhcnRtZW50cycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsU3BlY2lhbGl6YXRpb25zRm4gPSBmbignR2V0QWxsU3BlY2lhbGl6YXRpb25zJywgJ2dldEFsbFNwZWNpYWxpemF0aW9ucycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlTmV3U3BlY2lhbGl6YXRpb25GbiA9IGZuKCdDcmVhdGVOZXdTcGVjaWFsaXphdGlvbicsICdjcmVhdGVOZXdTcGVjaWFsaXphdGlvbicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgYnVsa0NyZWF0ZVNwZWNpYWxpemF0aW9uc0ZuID0gZm4oJ0J1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnMnLCAnYnVsa0NyZWF0ZVNwZWNpYWxpemF0aW9ucycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlQWxsU3BlY2lhbGl6YXRpb25zRm4gPSBmbignRGVsZXRlQWxsU3BlY2lhbGl6YXRpb25zJywgJ2RlbGV0ZUFsbFNwZWNpYWxpemF0aW9ucycsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgYWRtaW5QYW5lbEZuID0gZm4oJ1RpcnlhcUFkbWluUGFuZWwnLCAndGlyeWFxLWFkbWluLXBhbmVsJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCk7XHJcbiAgICAgICAgY29uc3QgZXhhbWluYXRpb25zRm4gPSBmbignVGlyeWFxRXhhbWluYXRpb25zJywgJ3RpcnlhcS1leGFtaW5hdGlvbnMnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBwaGFybWFjeUZuID0gZm4oJ1RpcnlhcVBoYXJtYWN5JywgJ3RpcnlhcS1waGFybWFjeScsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGRvY3VtZW50TWFuYWdlckZuID0gZm4oJ1RpcnlhcURvY3VtZW50TWFuYWdlcicsICd0aXJ5YXEtZG9jdW1lbnQtbWFuYWdlcicsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGF1ZGl0Rm4gPSBmbignVGlyeWFxQXVkaXQnLCAndGlyeWFxLWF1ZGl0JywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgYXBwb2ludG1lbnRzRm4gPSBmbignVGlyeWFxQXBwb2ludG1lbnRzJywgJ3RpcnlhcS1hcHBvaW50bWVudHMnLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICAvLyBIb3NwaXRhbCBjYWxlbmRhciDigJQgcmVwbGFjZXMgdGhlIHByZXZpb3VzIGV4dGVybmFsIENhbGVuZGFyUGxhdGZvcm0gU2FhUy5cclxuICAgICAgICAvLyBBbGwgY2FsZW5kYXIgZGF0YSBub3cgcGVyc2lzdHMgaW4gdGhlIEhvc3BpdGFsIER5bmFtb0RCIHRhYmxlIGZvclxyXG4gICAgICAgIC8vIFBEUFBMIGRhdGEtcmVzaWRlbmN5ICsgY2xpbmljYWwtcHJpdmFjeSBjb21wbGlhbmNlLlxyXG4gICAgICAgIGNvbnN0IGNhbGVuZGFyRm4gPSBmbignVGlyeWFxQ2FsZW5kYXInLCAndGlyeWFxLWNhbGVuZGFyJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCk7XHJcbiAgICAgICAgLy8gQmxvb2QgQmFuayBtb2R1bGUg4oCUIGRvbm9ycyAvIGRvbmF0aW9ucyAvIGludmVudG9yeSAvIHJlcXVlc3RzIC8gY3Jvc3NtYXRjaCAvIGlzc3VlLlxyXG4gICAgICAgIGNvbnN0IGJsb29kYmFua0ZuID0gZm4oJ1RpcnlhcUJsb29kYmFuaycsICd0aXJ5YXEtYmxvb2RiYW5rJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFNjcmliZUZpcnN0IFBoYXNlIDEg4oCUIFNPQVAgZ2VuZXJhdGlvbiBMYW1iZGEuXHJcbiAgICAgICAgLy8gQ2FsbHMgQmVkcm9jayBmb3IgdHJhbnNjcmlwdCDihpIgU09BUCBzcGxpdDsgd3JpdGVzIHNlc3Npb24gKyBhdWRpdFxyXG4gICAgICAgIC8vIHJvd3MgdG8gdGhlIGV4aXN0aW5nIHNpbmdsZS10YWJsZS5cclxuICAgICAgICAvLyBCRURST0NLX1JFR0lPTiBjYW4gZGlmZmVyIGZyb20gQVdTX1JFR0lPTiB3aGVuIEJlZHJvY2sgaXNuJ3QgeWV0XHJcbiAgICAgICAgLy8gYXZhaWxhYmxlIGluIHRoZSBkYXRhLXBsYW5lIHJlZ2lvbiAoZS5nLiBtZS1zb3V0aC0xIHByb2R1Y3Rpb24pLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNjcmliZUZuID0gZm4oXHJcbiAgICAgICAgICAgICdUaXJ5YXFTY3JpYmUnLFxyXG4gICAgICAgICAgICAndGlyeWFxLXNjcmliZScsXHJcbiAgICAgICAgICAgICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICAgICAgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIEJFRFJPQ0tfUkVHSU9OOiAndXMtZWFzdC0xJyxcclxuICAgICAgICAgICAgICAgIC8vIENsYXVkZSAzLjUgSGFpa3UgdmlhIHRoZSBVUyBjcm9zcy1yZWdpb24gaW5mZXJlbmNlIHByb2ZpbGUuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGUgb3JpZ2luYWwgY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDcgbW9kZWwgd2FzIHJldGlyZWQvbWFya2VkXHJcbiAgICAgICAgICAgICAgICAvLyBsZWdhY3kgYnkgdGhlIHByb3ZpZGVyLCB3aGljaCBjYXVzZWQgSW52b2tlTW9kZWwgQWNjZXNzRGVuaWVkLlxyXG4gICAgICAgICAgICAgICAgLy8gTmV3ZXIgQW50aHJvcGljIG1vZGVscyBvbiBCZWRyb2NrIGFyZSBvbmx5IGludm9rYWJsZSB0aHJvdWdoIGFuXHJcbiAgICAgICAgICAgICAgICAvLyBpbmZlcmVuY2UgcHJvZmlsZSAodGhlIFwidXMuXCIgcHJlZml4KSwgbm90IHRoZSBiYXJlIG1vZGVsIElELlxyXG4gICAgICAgICAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogJ3VzLmFudGhyb3BpYy5jbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxLXYxOjAnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgICAgIC8vIEFsbG93IEJlZHJvY2sgSW52b2tlTW9kZWwgb24gdGhlIENsYXVkZSAzLjUgSGFpa3UgVVMgaW5mZXJlbmNlIHByb2ZpbGUuXHJcbiAgICAgICAgLy8gQSBjcm9zcy1yZWdpb24gaW5mZXJlbmNlIHByb2ZpbGUgcmVxdWlyZXMgcGVybWlzc2lvbiBvbiBCT1RIIHRoZVxyXG4gICAgICAgIC8vIHByb2ZpbGUgQVJOIGFuZCB0aGUgdW5kZXJseWluZyBmb3VuZGF0aW9uLW1vZGVsIEFSTnMgaW4gZXZlcnkgcmVnaW9uXHJcbiAgICAgICAgLy8gdGhlIHByb2ZpbGUgY2FuIHJvdXRlIHRvICh1cy1lYXN0LTEgLyB1cy1lYXN0LTIgLyB1cy13ZXN0LTIpLlxyXG4gICAgICAgIHNjcmliZUZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydiZWRyb2NrOkludm9rZU1vZGVsJ10sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICBgYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMToke3RoaXMuYWNjb3VudH06aW5mZXJlbmNlLXByb2ZpbGUvdXMuYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MGAsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy13ZXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDEtdjE6MCdcclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBEeW5hbW9EQiBwZXJtaXNzaW9uc1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGFsbEZ1bmN0aW9ucyA9IFtcclxuICAgICAgICAgICAgZ2V0QWxsUGF0aWVudHNGbixcclxuICAgICAgICAgICAgZ2V0UGF0aWVudEJ5SURGbixcclxuICAgICAgICAgICAgY3JlYXRlUGF0aWVudEZuLFxyXG4gICAgICAgICAgICB1cGRhdGVQYXRpZW50Rm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZVBhdGllbnRGbixcclxuICAgICAgICAgICAgZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzRm4sXHJcbiAgICAgICAgICAgIGdldEFsbERvY3RvcnNGbixcclxuICAgICAgICAgICAgZ2V0RG9jdG9yQnlJREZuLFxyXG4gICAgICAgICAgICBnZXREb2N0b3JCeUVtYWlsRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZURvY3RvckZuLFxyXG4gICAgICAgICAgICB1cGRhdGVEb2N0b3JGbixcclxuICAgICAgICAgICAgZGVsZXRlRG9jdG9yRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZVBhdGllbnRQYXltZW50Rm4sXHJcbiAgICAgICAgICAgIGdldEFsbFBheW1lbnRzRm9yUGF0aWVudEZuLFxyXG4gICAgICAgICAgICBsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJREZuLFxyXG4gICAgICAgICAgICB1cGRhdGVQYXRpZW50UGF5bWVudEZuLFxyXG4gICAgICAgICAgICBnZXRQYXltZW50QnlJREZuLFxyXG4gICAgICAgICAgICBkZWxldGVQYXltZW50Rm4sXHJcbiAgICAgICAgICAgIGdldEFsbEludm9pY2VzRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZVBhdGllbnRTdXJnZXJ5Rm4sXHJcbiAgICAgICAgICAgIGxpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJREZuLFxyXG4gICAgICAgICAgICBnZXRTdXJnZXJ5QnlJREZuLFxyXG4gICAgICAgICAgICBnZXRBbGxEZXBhcnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBjcmVhdGVOZXdEZXBhcnRtZW50Rm4sXHJcbiAgICAgICAgICAgIGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBkZWxldGVBbGxEZXBhcnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBnZXRBbGxTcGVjaWFsaXphdGlvbnNGbixcclxuICAgICAgICAgICAgY3JlYXRlTmV3U3BlY2lhbGl6YXRpb25GbixcclxuICAgICAgICAgICAgYnVsa0NyZWF0ZVNwZWNpYWxpemF0aW9uc0ZuLFxyXG4gICAgICAgICAgICBkZWxldGVBbGxTcGVjaWFsaXphdGlvbnNGbixcclxuICAgICAgICAgICAgYWRtaW5QYW5lbEZuLFxyXG4gICAgICAgICAgICBleGFtaW5hdGlvbnNGbixcclxuICAgICAgICAgICAgcGhhcm1hY3lGbixcclxuICAgICAgICAgICAgZG9jdW1lbnRNYW5hZ2VyRm4sXHJcbiAgICAgICAgICAgIGF1ZGl0Rm4sXHJcbiAgICAgICAgICAgIGFwcG9pbnRtZW50c0ZuLFxyXG4gICAgICAgICAgICBjYWxlbmRhckZuLFxyXG4gICAgICAgICAgICBibG9vZGJhbmtGbixcclxuICAgICAgICAgICAgc2NyaWJlRm5cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBhbGxGdW5jdGlvbnMuZm9yRWFjaCgoZikgPT4ge1xyXG4gICAgICAgICAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZik7XHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2U6IExhbWJkYSBleGVjdXRpb24gcm9sZXMgbXVzdCBiZSBleHBsaWNpdGx5IGdyYW50ZWRcclxuICAgICAgICAgICAgLy8gS01TIEVuY3J5cHQvRGVjcnlwdCBvbiB0aGUgZGF0YSBDTUsgYmVjYXVzZSBEeW5hbW9EQiBDVVNUT01FUl9NQU5BR0VEXHJcbiAgICAgICAgICAgIC8vIGVuY3J5cHRpb24gcmVxdWlyZXMgdGhlIGNhbGxlciBwcmluY2lwYWwgdG8gaGF2ZSBrZXkgYWNjZXNzLlxyXG4gICAgICAgICAgICB0aXJ5YXFEYXRhS2V5LmdyYW50RW5jcnlwdERlY3J5cHQoZik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIExhbWJkYSB3YXJtZXIg4oCUIHBpbmdzIGF1dGgtY3JpdGljYWwgYW5kIGRhc2hib2FyZCBMYW1iZGFzIGV2ZXJ5IDVcclxuICAgICAgICAvLyBtaW51dGVzIHNvIGZpcnN0LXVzZXItb2YtdGhlLWRheSBkb2Vzbid0IHBheSB0aGUgY29sZC1zdGFydCB0YXguXHJcbiAgICAgICAgLy8gRWFjaCBwaW5nIGNvc3RzICQwICh0aGUgTGFtYmRhIHNob3J0LWNpcmN1aXRzIG9uIGEgYF93YXJtdXBgIGV2ZW50KS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB3YXJtVGFyZ2V0cyA9IFtcclxuICAgICAgICAgICAgcHJlVG9rZW5GbixcclxuICAgICAgICAgICAgYXBwb2ludG1lbnRzRm4sXHJcbiAgICAgICAgICAgIGdldEFsbFBhdGllbnRzRm4sXHJcbiAgICAgICAgICAgIGdldEFsbERvY3RvcnNGbixcclxuICAgICAgICAgICAgZ2V0QWxsSW52b2ljZXNGbixcclxuICAgICAgICAgICAgZXhhbWluYXRpb25zRm4sXHJcbiAgICAgICAgICAgIHBoYXJtYWN5Rm4sXHJcbiAgICAgICAgICAgIGJsb29kYmFua0ZuXHJcbiAgICAgICAgXS5maWx0ZXIoQm9vbGVhbikgYXMgbGFtYmRhLkZ1bmN0aW9uW107XHJcblxyXG4gICAgICAgIGNvbnN0IHdhcm1lclJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ1RpcnlhcUxhbWJkYVdhcm1lcicsIHtcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdLZWVwcyBhdXRoICsgZGFzaGJvYXJkIExhbWJkYXMgd2FybSB0byBlbGltaW5hdGUgY29sZC1zdGFydCBsYXRlbmN5LicsXHJcbiAgICAgICAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUucmF0ZShjZGsuRHVyYXRpb24ubWludXRlcyg1KSlcclxuICAgICAgICB9KTtcclxuICAgICAgICB3YXJtVGFyZ2V0cy5mb3JFYWNoKCh0YXJnZXQsIGkpID0+IHtcclxuICAgICAgICAgICAgd2FybWVyUnVsZS5hZGRUYXJnZXQobmV3IGV2ZW50c1RhcmdldHMuTGFtYmRhRnVuY3Rpb24odGFyZ2V0LCB7XHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZlbnRzLlJ1bGVUYXJnZXRJbnB1dC5mcm9tT2JqZWN0KHsgX3dhcm11cDogdHJ1ZSwgaWR4OiBpIH0pXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gU2VlZCBMYW1iZGEgYWxzbyB3cml0ZXMgdG8gdGhlIGVuY3J5cHRlZCB0YWJsZS5cclxuICAgICAgICAvLyAoZ3JhbnRlZCBmdXJ0aGVyIGRvd24gd2hlcmUgc2VlZEZuIGlzIGRlZmluZWQuKVxyXG5cclxuICAgICAgICBhZG1pblBhbmVsRm4uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2NvZ25pdG8taWRwOkxpc3RVc2VycycsICdjb2duaXRvLWlkcDpMaXN0VXNlcnNJbkdyb3VwJywgJ2NvZ25pdG8taWRwOkFkbWluRGlzYWJsZVVzZXInLCAnY29nbml0by1pZHA6QWRtaW5FbmFibGVVc2VyJywgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJ10sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyBEb2N1bWVudHMgYnVja2V0IGFjY2VzcyBpcyBncmFudGVkIG9uIHRoZSBidWNrZXQgY29uc3RydWN0IGJlbG93XHJcbiAgICAgICAgLy8gKHNlZSBUaXJ5YXFEb2N1bWVudHNCdWNrZXQpLCBzbyBubyBjcm9zcy1hY2NvdW50IGlubGluZSBwb2xpY3kgaGVyZS5cclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU2VlZCBMYW1iZGEg4oCUIGRlcGFydG1lbnRzLCBzcGVjaWFsaXphdGlvbnMsIGNvdW50ZXJzXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3Qgc2VlZEZuID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGlyeWFxU2VlZEZ1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0aXJ5YXEtc2VlZCcsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDogeyBUQUJMRV9OQU1FOiAnSG9zcGl0YWwnIH0sXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxyXG5jb25zdCB7IER5bmFtb0RCQ2xpZW50IH0gPSByZXF1aXJlKCdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInKTtcclxuY29uc3QgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcclxuY29uc3QgeyByYW5kb21VVUlEIH0gPSByZXF1aXJlKCdjcnlwdG8nKTtcclxuY29uc3QgY2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKG5ldyBEeW5hbW9EQkNsaWVudCh7fSkpO1xyXG5jb25zdCBUQUJMRSAgPSBwcm9jZXNzLmVudi5UQUJMRV9OQU1FO1xyXG5jb25zdCBERVBBUlRNRU5UUyA9ICR7SlNPTi5zdHJpbmdpZnkoREVQQVJUTUVOVFMpfTtcclxuY29uc3QgU1BFQ0lBTElaQVRJT05TID0gJHtKU09OLnN0cmluZ2lmeShTUEVDSUFMSVpBVElPTlMpfTtcclxuXHJcbi8vIGF0dHJpYnV0ZV9ub3RfZXhpc3RzKFBLKSBtYWtlcyBldmVyeSBQdXQgaWRlbXBvdGVudCDigJQgZXhpc3Rpbmcgcm93cyBhcmVcclxuLy8gcHJlc2VydmVkLiBUaGlzIHByb3RlY3RzIHRoZSBwYXRpZW50L2RvY3RvciBjb3VudGVycyBmcm9tIGJlaW5nIHJlc2V0IG9uXHJcbi8vIGFueSBmdXR1cmUgcmVwbGF5IG9mIHRoaXMgQ3VzdG9tUmVzb3VyY2UuXHJcbmFzeW5jIGZ1bmN0aW9uIHB1dElmQWJzZW50KGl0ZW0pIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgY2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgICAgICBUYWJsZU5hbWU6IFRBQkxFLFxyXG4gICAgICAgICAgICBJdGVtOiBpdGVtLFxyXG4gICAgICAgICAgICBDb25kaXRpb25FeHByZXNzaW9uOiAnYXR0cmlidXRlX25vdF9leGlzdHMoUEspJ1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBpZiAoZS5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHJldHVybiBmYWxzZTtcclxuICAgICAgICB0aHJvdyBlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIC8vIFJlcXVlc3RUeXBlIGhhbmRsaW5nOlxyXG4gICAgLy8gICBDcmVhdGUg4oaSIHJ1biB0aGUgZnVsbCBzZWVkLlxyXG4gICAgLy8gICBVcGRhdGUg4oaSIE5PLU9QLiBSZWZlcmVuY2UgZGF0YSAoZGVwYXJ0bWVudHMsIHNwZWNpYWxpemF0aW9ucykgYW5kXHJcbiAgICAvLyAgICAgICAgICAgIGxpdmUgY291bnRlcnMgbXVzdCBub3QgYmUgcmVnZW5lcmF0ZWQgYXV0b21hdGljYWxseS4gVG9cclxuICAgIC8vICAgICAgICAgICAgcmUtc2VlZCBpbnRlbnRpb25hbGx5LCByZXBsYWNlIHRoaXMgQ3VzdG9tUmVzb3VyY2UgdmlhXHJcbiAgICAvLyAgICAgICAgICAgIGNvbnNvbGUgb3IgYnVtcCB0aGUgbG9naWNhbCBpZC5cclxuICAgIC8vICAgRGVsZXRlIOKGkiBOTy1PUC4gTmV2ZXIgZGVzdHJveSBzZWVkZWQgcmVmZXJlbmNlIGRhdGEgb24gc3RhY2sgZGVsZXRlLlxyXG4gICAgaWYgKGV2ZW50LlJlcXVlc3RUeXBlICE9PSAnQ3JlYXRlJykge1xyXG4gICAgICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3NlZWQnLCBEYXRhOiB7IHNraXBwZWQ6IGV2ZW50LlJlcXVlc3RUeXBlIH0gfTtcclxuICAgIH1cclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgIGxldCB3cml0dGVuID0gMDtcclxuICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiAnQ09VTlRFUiNQQVRJRU5UUycsIFNLOiAnQ09VTlRFUicsIGNvdW50OiAwLCBFbnRpdHlUeXBlOiAnQ09VTlRFUicgfSkpIHdyaXR0ZW4rKztcclxuICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiAnQ09VTlRFUiNET0NUT1JTJywgIFNLOiAnQ09VTlRFUicsIGNvdW50OiAwLCBFbnRpdHlUeXBlOiAnQ09VTlRFUicgfSkpIHdyaXR0ZW4rKztcclxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBERVBBUlRNRU5UUykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gcmFuZG9tVVVJRCgpO1xyXG4gICAgICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiBcXGBERVBBUlRNRU5UI1xcJHtpZH1cXGAsIFNLOiAnUFJPRklMRScsIEVudGl0eVR5cGU6ICdERVBBUlRNRU5UJywgZGVwYXJ0bWVudElkOiBpZCwgbmFtZSwgY3JlYXRlZEF0OiBub3cgfSkpIHdyaXR0ZW4rKztcclxuICAgIH1cclxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBTUEVDSUFMSVpBVElPTlMpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHJhbmRvbVVVSUQoKTtcclxuICAgICAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogXFxgU1BFQ0lBTElaQVRJT04jXFwke2lkfVxcYCwgU0s6ICdQUk9GSUxFJywgRW50aXR5VHlwZTogJ1NQRUNJQUxJWkFUSU9OJywgc3BlY2lhbGl6YXRpb25JZDogaWQsIG5hbWUsIGNyZWF0ZWRBdDogbm93IH0pKSB3cml0dGVuKys7XHJcbiAgICB9XHJcbiAgICByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6ICdzZWVkJywgRGF0YTogeyB3cml0dGVuIH0gfTtcclxufTtcclxuICAgICAgICAgICAgYClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuZ3JhbnRXcml0ZURhdGEoc2VlZEZuKTtcclxuICAgICAgICB0aXJ5YXFEYXRhS2V5LmdyYW50RW5jcnlwdERlY3J5cHQoc2VlZEZuKTtcclxuICAgICAgICBjb25zdCBzZWVkUHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ1NlZWRQcm92aWRlcicsIHsgb25FdmVudEhhbmRsZXI6IHNlZWRGbiB9KTtcclxuICAgICAgICAvLyBTdGFibGUgcHJvcGVydHkg4oCUIHNhbWUgb24gZXZlcnkgc3ludGgg4oCUIHNvIENsb3VkRm9ybWF0aW9uIGRvZXMgTk9UXHJcbiAgICAgICAgLy8gcmUtdHJpZ2dlciBhbiBVcGRhdGUgb2YgdGhlIFNlZWREYXRhIEN1c3RvbVJlc291cmNlIG9uIGBjZGsgZGVwbG95YC5cclxuICAgICAgICAvLyBQcmV2aW91c2x5IGB0aW1lc3RhbXA6IERhdGUubm93KClgIGNhdXNlZCB0aGUgc2VlZCBMYW1iZGEgdG8gcnVuIG9uXHJcbiAgICAgICAgLy8gZXZlcnkgZGVwbG95LCByZXNldHRpbmcgcGF0aWVudC9kb2N0b3IgY291bnRlcnMgYW5kIGR1cGxpY2F0aW5nXHJcbiAgICAgICAgLy8gZGVwYXJ0bWVudC9zcGVjaWFsaXphdGlvbiByZWNvcmRzLlxyXG4gICAgICAgIG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgJ1NlZWREYXRhJywge1xyXG4gICAgICAgICAgICBzZXJ2aWNlVG9rZW46IHNlZWRQcm92aWRlci5zZXJ2aWNlVG9rZW4sXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgc2VlZFZlcnNpb246IDEgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkg4oCUIG5vIHNoYXJlZCAvIGhhcmRjb2RlZCBjcmVkZW50aWFscy5cclxuICAgICAgICAvLyBFYWNoIHNlZWRlZCB1c2VyIGdldHMgYSBDUllQVE9HUkFQSElDQUxMWSBSQU5ET00gdGVtcG9yYXJ5IHBhc3N3b3JkXHJcbiAgICAgICAgLy8gdGhhdCBzYXRpc2ZpZXMgdGhlIHN0cmVuZ3RoZW5lZCBwYXNzd29yZCBwb2xpY3kuIFRoZSBwYXNzd29yZCBpczpcclxuICAgICAgICAvLyAgIC0gaXNzdWVkIGFzIFRFTVBPUkFSWSAoUGVybWFuZW50PWZhbHNlKSBzbyBDb2duaXRvIGZvcmNlcyBhXHJcbiAgICAgICAgLy8gICAgIHBhc3N3b3JkIGNoYW5nZSBhdCBmaXJzdCBsb2dpbixcclxuICAgICAgICAvLyAgIC0gc3RvcmVkIGluIEFXUyBTZWNyZXRzIE1hbmFnZXIgdW5kZXJcclxuICAgICAgICAvLyAgICAgL3RpcnlhcS9zZWVkLXVzZXJzLzx1c2VybmFtZT4sIGVuY3J5cHRlZCB3aXRoIHRoZSBkYXRhIENNSyxcclxuICAgICAgICAvLyAgIC0gbmV2ZXIgbG9nZ2VkLCBuZXZlciByZXR1cm5lZCB0byB0aGUgQVBJIGNhbGxlci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB1c2Vyc0ZuID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGlyeWFxVXNlcnNGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAndGlyeWFxLWNyZWF0ZS11c2VycycsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAgICAgREFUQV9LTVNfS0VZX0lEOiB0aXJ5YXFEYXRhS2V5LmtleUlkXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxyXG5jb25zdCB7IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LCBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kLCBBZG1pbkFkZFVzZXJUb0dyb3VwQ29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInKTtcclxuY29uc3QgeyBTZWNyZXRzTWFuYWdlckNsaWVudCwgQ3JlYXRlU2VjcmV0Q29tbWFuZCwgUHV0U2VjcmV0VmFsdWVDb21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJyk7XHJcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xyXG5cclxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7fSk7XHJcbmNvbnN0IHNlY3JldHMgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe30pO1xyXG5jb25zdCBQT09MID0gcHJvY2Vzcy5lbnYuVVNFUl9QT09MX0lEO1xyXG5jb25zdCBLRVkgID0gcHJvY2Vzcy5lbnYuREFUQV9LTVNfS0VZX0lEO1xyXG5cclxuY29uc3QgU0VFRF9VU0VSUyA9IFtcclxuICAgIHsgdXNlcm5hbWU6ICdhZG1pbjEnLCAgICAgIG5hbWU6ICdBZG1pbiBPbmUnLCAgICAgIGVtYWlsOiAnYWRtaW4xQHRpcnlhcS5jb20nLCAgICAgIGdyb3VwOiAnQWRtaW4nIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAnYWRtaW4yJywgICAgICBuYW1lOiAnQWRtaW4gVHdvJywgICAgICBlbWFpbDogJ2FkbWluMkB0aXJ5YXEuY29tJywgICAgICBncm91cDogJ0FkbWluJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RldmVsb3BlcjEnLCAgbmFtZTogJ0RldmVsb3BlciBPbmUnLCAgZW1haWw6ICdkZXYxQHRpcnlhcS5jb20nLCAgICAgICAgZ3JvdXA6ICdEZXZlbG9wZXJzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RldmVsb3BlcjInLCAgbmFtZTogJ0RldmVsb3BlciBUd28nLCAgZW1haWw6ICdkZXYyQHRpcnlhcS5jb20nLCAgICAgICAgZ3JvdXA6ICdEZXZlbG9wZXJzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RvY3RvcjEnLCAgICAgbmFtZTogJ0RvY3RvciBPbmUnLCAgICAgZW1haWw6ICdkb2N0b3IxQHRpcnlhcS5jb20nLCAgICAgZ3JvdXA6ICdEb2N0b3JzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RvY3RvcjInLCAgICAgbmFtZTogJ0RvY3RvciBUd28nLCAgICAgZW1haWw6ICdkb2N0b3IyQHRpcnlhcS5jb20nLCAgICAgZ3JvdXA6ICdEb2N0b3JzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ3BoYXJtYWNpc3QxJywgbmFtZTogJ1BoYXJtYWNpc3QgT25lJywgZW1haWw6ICdwaGFybWFjaXN0MUB0aXJ5YXEuY29tJywgZ3JvdXA6ICdQaGFybWFjaXN0cycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdwaGFybWFjaXN0MicsIG5hbWU6ICdQaGFybWFjaXN0IFR3bycsIGVtYWlsOiAncGhhcm1hY2lzdDJAdGlyeWFxLmNvbScsIGdyb3VwOiAnUGhhcm1hY2lzdHMnIH1cclxuXTtcclxuXHJcbi8vIEdlbmVyYXRlcyBhIDIwLWNoYXIgcGFzc3dvcmQgdGhhdCBhbHdheXMgc2F0aXNmaWVzIHRoZSBwb2xpY3k6XHJcbi8vIHVwcGVyLCBsb3dlciwgZGlnaXQsIHN5bWJvbCwgbGVuZ3RoID49IDEyLlxyXG5mdW5jdGlvbiBnZW5lcmF0ZVRlbXBQYXNzd29yZCgpIHtcclxuICAgIGNvbnN0IHVwcGVyID0gJ0FCQ0RFRkdISktMTU5QUVJTVFVWV1hZWic7XHJcbiAgICBjb25zdCBsb3dlciA9ICdhYmNkZWZnaGlqa21ucHFyc3R1dnd4eXonO1xyXG4gICAgY29uc3QgZGlnaXQgPSAnMjM0NTY3ODknO1xyXG4gICAgY29uc3Qgc3ltYm9sID0gJyFAIyQlXiYqKCktXz0rJztcclxuICAgIGNvbnN0IGFsbCA9IHVwcGVyICsgbG93ZXIgKyBkaWdpdCArIHN5bWJvbDtcclxuICAgIGNvbnN0IHBpY2sgPSAoc2V0KSA9PiBzZXRbY3J5cHRvLnJhbmRvbUludCgwLCBzZXQubGVuZ3RoKV07XHJcbiAgICBsZXQgcHdkID0gcGljayh1cHBlcikgKyBwaWNrKGxvd2VyKSArIHBpY2soZGlnaXQpICsgcGljayhzeW1ib2wpO1xyXG4gICAgd2hpbGUgKHB3ZC5sZW5ndGggPCAyMCkgcHdkICs9IHBpY2soYWxsKTtcclxuICAgIHJldHVybiBwd2Quc3BsaXQoJycpLnNvcnQoKCkgPT4gY3J5cHRvLnJhbmRvbUludCgwLCAyKSAtIDEpLmpvaW4oJycpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdG9yZVNlY3JldCh1c2VybmFtZSwgcGFzc3dvcmQpIHtcclxuICAgIGNvbnN0IG5hbWUgPSAnL3RpcnlhcS9zZWVkLXVzZXJzLycgKyB1c2VybmFtZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgc2VjcmV0cy5zZW5kKG5ldyBDcmVhdGVTZWNyZXRDb21tYW5kKHtcclxuICAgICAgICAgICAgTmFtZTogbmFtZSxcclxuICAgICAgICAgICAgRGVzY3JpcHRpb246ICdUZW1wb3JhcnkgcGFzc3dvcmQgZm9yIHNlZWRlZCBUaXJ5YXEgdXNlciDigJQgbXVzdCBiZSBjaGFuZ2VkIG9uIGZpcnN0IGxvZ2luLicsXHJcbiAgICAgICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZSwgdGVtcG9yYXJ5UGFzc3dvcmQ6IHBhc3N3b3JkLCBtdXN0Q2hhbmdlOiB0cnVlIH0pLFxyXG4gICAgICAgICAgICBLbXNLZXlJZDogS0VZXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGlmIChlLm5hbWUgPT09ICdSZXNvdXJjZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgICAgICAgYXdhaXQgc2VjcmV0cy5zZW5kKG5ldyBQdXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgU2VjcmV0SWQ6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWUsIHRlbXBvcmFyeVBhc3N3b3JkOiBwYXNzd29yZCwgbXVzdENoYW5nZTogdHJ1ZSB9KVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xyXG4gICAgaWYgKGV2ZW50LlJlcXVlc3RUeXBlID09PSAnRGVsZXRlJykgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAndXNlcnMnIH07XHJcbiAgICBmb3IgKGNvbnN0IHVzZXIgb2YgU0VFRF9VU0VSUykge1xyXG4gICAgICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGdlbmVyYXRlVGVtcFBhc3N3b3JkKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gUGVybWFuZW50PWZhbHNlIChkZWZhdWx0KSDihpIgQ29nbml0byBmbGFncyBGT1JDRV9DSEFOR0VfUEFTU1dPUkQuXHJcbiAgICAgICAgICAgIGF3YWl0IGNvZ25pdG8uc2VuZChuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgICAgICAgICBVc2VyUG9vbElkOiBQT09MLFxyXG4gICAgICAgICAgICAgICAgVXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnLFxyXG4gICAgICAgICAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgICAgICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBOYW1lOiAnZW1haWwnLCAgICAgICAgICBWYWx1ZTogdXNlci5lbWFpbCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ2VtYWlsX3ZlcmlmaWVkJywgVmFsdWU6ICd0cnVlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ25hbWUnLCAgICAgICAgICAgVmFsdWU6IHVzZXIubmFtZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ2dlbmRlcicsICAgICAgICAgVmFsdWU6ICdNYWxlJyB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkFkZFVzZXJUb0dyb3VwQ29tbWFuZCh7XHJcbiAgICAgICAgICAgICAgICBVc2VyUG9vbElkOiBQT09MLCBVc2VybmFtZTogdXNlci51c2VybmFtZSwgR3JvdXBOYW1lOiB1c2VyLmdyb3VwXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgYXdhaXQgc3RvcmVTZWNyZXQodXNlci51c2VybmFtZSwgdGVtcFBhc3N3b3JkKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGlmIChlLm5hbWUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIC8vIFVzZXIgYWxyZWFkeSBleGlzdHMg4oCUIGRvIG5vdCByZXNldCB0aGVpciBwYXNzd29yZCBzaWxlbnRseS5cclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAndXNlcnMnIH07XHJcbn07XHJcbiAgICAgICAgICAgIGApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHVzZXJzRm4uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQWRkVXNlclRvR3JvdXAnXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdXNlcnNGbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6Q3JlYXRlU2VjcmV0JyxcclxuICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6UHV0U2VjcmV0VmFsdWUnLFxyXG4gICAgICAgICAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpEZXNjcmliZVNlY3JldCdcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzZWNyZXRzbWFuYWdlcjoke3JlZ2lvbn06JHthY2NvdW50SWR9OnNlY3JldDovdGlyeWFxL3NlZWQtdXNlcnMvKmBdXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gTGFtYmRhIG11c3QgYmUgYWxsb3dlZCB0byB1c2UgdGhlIGRhdGEgQ01LIHRvIGVuY3J5cHQgdGhlIHNlY3JldC5cclxuICAgICAgICB0aXJ5YXFEYXRhS2V5LmdyYW50RW5jcnlwdERlY3J5cHQodXNlcnNGbik7XHJcblxyXG4gICAgICAgIGNvbnN0IHVzZXJzUHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ1VzZXJzUHJvdmlkZXInLCB7IG9uRXZlbnRIYW5kbGVyOiB1c2Vyc0ZuIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgJ0NyZWF0ZVVzZXJzJywge1xyXG4gICAgICAgICAgICBzZXJ2aWNlVG9rZW46IHVzZXJzUHJvdmlkZXIuc2VydmljZVRva2VuLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHVzZXJQb29sSWQ6IHVzZXJQb29sLnVzZXJQb29sSWQgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBBUEkgR2F0ZXdheSArIEpXVCBBdXRob3JpemVyXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBIdHRwSnd0QXV0aG9yaXplcignVGlyeWFxQXV0aG9yaXplcicsIGBodHRwczovL2NvZ25pdG8taWRwLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tLyR7dXNlclBvb2wudXNlclBvb2xJZH1gLCB7XHJcbiAgICAgICAgICAgIGp3dEF1ZGllbmNlOiBbYXBwQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRdLFxyXG4gICAgICAgICAgICBpZGVudGl0eVNvdXJjZTogWyckcmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbiddXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIEFydC4gOSAoaW50ZWdyaXR5ICYgY29uZmlkZW50aWFsaXR5KS5cclxuICAgICAgICAvLyBDT1JTIGlzIHJlc3RyaWN0ZWQgdG8gdGhlIHByb2R1Y3Rpb24gQ2xvdWRGcm9udCBkb21haW4gcGx1cyBsb2NhbGhvc3RcclxuICAgICAgICAvLyBmb3IgZGV2LiBXaWxkY2FyZCBvcmlnaW5zIGFyZSBmb3JiaWRkZW4g4oCUIHRoZXkgZW5hYmxlIGNyb3NzLXNpdGUgZGF0YVxyXG4gICAgICAgIC8vIGV4ZmlsdHJhdGlvbiBmcm9tIHRoZSBwYXRpZW50J3MgYnJvd3Nlci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhbGxvd2VkT3JpZ2lucyA9IFtcclxuICAgICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMCcsXHJcbiAgICAgICAgICAgICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQnLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly9ha3dhZG9uYS5jb20nLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly93d3cuYWt3YWRvbmEuY29tJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgYXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnVGlyeWFxSHR0cEFwaScsIHtcclxuICAgICAgICAgICAgYXBpTmFtZTogJ3RpcnlhcS1hcGknLFxyXG4gICAgICAgICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgICAgICAgICBhbGxvd09yaWdpbnM6IGFsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5HRVQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuUEFUQ0gsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5PUFRJT05TXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtQ2xpZW50LVJlcXVlc3QtSWQnXSxcclxuICAgICAgICAgICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24ubWludXRlcygxMClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCByb3V0ZSA9IChwYXRoOiBzdHJpbmcsIG1ldGhvZHM6IGFwaWd3djIuSHR0cE1ldGhvZFtdLCBoYW5kbGVyOiBsYW1iZGEuRnVuY3Rpb24pID0+XHJcbiAgICAgICAgICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICAgICAgICAgICAgcGF0aCxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHMsXHJcbiAgICAgICAgICAgICAgICBpbnRlZ3JhdGlvbjogbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihwYXRoLnJlcGxhY2UoL1teYS16QS1aMC05XS9nLCAnJykgKyBtZXRob2RzLmpvaW4oJycpLCBoYW5kbGVyKSxcclxuICAgICAgICAgICAgICAgIGF1dGhvcml6ZXJcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbFBhdGllbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFBhdGllbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcmVzdG9yZScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCB1cGRhdGVQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMvc2VhcmNoJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxEb2N0b3JzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZURvY3RvckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMve2RvY3RvcklEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0RG9jdG9yQnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMve2RvY3RvcklEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCB1cGRhdGVEb2N0b3JGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL3tkb2N0b3JJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZURvY3RvckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMvZW1haWwve2VtYWlsfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0RG9jdG9yQnlFbWFpbEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxQYXltZW50c0ZvclBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZVBhdGllbnRQYXltZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMve3BheW1lbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFBheW1lbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMve3BheW1lbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlUGF0aWVudFBheW1lbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cy97cGF5bWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlUGF5bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BheW1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL2ludm9pY2VzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxJbnZvaWNlc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3N1cmdlcmllcycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgbGlzdEFsbFN1cmdlcmllc0ZvclBhdGllbnRCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vc3VyZ2VyaWVzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlUGF0aWVudFN1cmdlcnlGbik7XHJcbiAgICAgICAgcm91dGUoJy9zdXJnZXJpZXMve3N1cmdlcnlJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldFN1cmdlcnlCeUlERm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbERlcGFydG1lbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVOZXdEZXBhcnRtZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZGVwYXJ0bWVudHMvYnVsaycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVBbGxEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3NwZWNpYWxpemF0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsU3BlY2lhbGl6YXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlTmV3U3BlY2lhbGl6YXRpb25Gbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMvYnVsaycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZUFsbFNwZWNpYWxpemF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3N0YXRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGFkbWluUGFuZWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9hZG1pbi91c2Vycy97dXNlcm5hbWV9L2Rpc2FibGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9lbmFibGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9zZXQtcGFzc3dvcmQnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vYXVkaXQnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGFkbWluUGFuZWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9leGFtaW5hdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBleGFtaW5hdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9leGFtaW5hdGlvbnMve2V4YW1JZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zL3tleGFtSWR9L3NpZ25vZmYnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBleGFtaW5hdGlvbnNGbik7XHJcbiAgICAgICAgLy8gUGhhcm1hY3kgcm91dGVzIOKAlCBwYXRocyBtYXRjaCB0aGUgdGlyeWFxLXBoYXJtYWN5IExhbWJkYSdzIGludGVybmFsIHJvdXRlci5cclxuICAgICAgICAvLyAoTGFtYmRhIGRpc3BhdGNoZXMgb24gZXZlbnQucmF3UGF0aDsgQ0RLIG11c3QgcmVnaXN0ZXIgaWRlbnRpY2FsIHBhdGhzLilcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L21lZGljYXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9tZWRpY2F0aW9ucy97bWVkSWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvaW52ZW50b3J5JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9pbnZlbnRvcnkve21lZElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3ByZXNjcmlwdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3ByZXNjcmlwdGlvbnMve3J4SWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvZGlzcGVuc2UnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3B1cmNoYXNlLW9yZGVycycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvcHVyY2hhc2Utb3JkZXJzL3twb0lkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2FsZXJ0cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgLy8gRG9jdW1lbnQgbWFuYWdlciDigJQgcGF0aHMgbWF0Y2ggdGhlIHRpcnlhcS1kb2N1bWVudC1tYW5hZ2VyIExhbWJkYSdzXHJcbiAgICAgICAgLy8gaW50ZXJuYWwgcm91dGVyIGFuZCB0aGUgQW5ndWxhciBEb2N1bWVudFNlcnZpY2UgY2FsbHMuXHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvdXBsb2FkLXVybCcsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9kb3dubG9hZC11cmwnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvbGlzdCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL2ZvbGRlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9kZWxldGUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2F1ZGl0JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYXVkaXRGbik7XHJcbiAgICAgICAgcm91dGUoJy9hcHBvaW50bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBhcHBvaW50bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9hcHBvaW50bWVudHMve2FwcHRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYXBwb2ludG1lbnRzRm4pO1xyXG5cclxuICAgICAgICAvLyBIb3NwaXRhbCBjYWxlbmRhciByb3V0ZXMg4oCUIFRpcnlhcS1sb2NhbCwgSldULWF1dGhlbnRpY2F0ZWQuXHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGNhbGVuZGFyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvY2FsZW5kYXJzL3tjYWxlbmRhcklkfS9ldmVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0vZXZlbnRzL3tldmVudElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBjYWxlbmRhckZuKTtcclxuXHJcbiAgICAgICAgLy8gQmxvb2QgQmFuayBtb2R1bGVcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMve2Rvbm9ySWR9JywgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL2Rvbm9ycy97ZG9ub3JJZH0vZG9uYXRpb25zJywgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL2RvbmF0aW9ucycsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3VuaXRzJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3VuaXRzL3t1bml0SWR9JywgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvc3RvY2snLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMve3JlcXVlc3RJZH0nLCAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9yZXF1ZXN0cy97cmVxdWVzdElkfS9jcm9zc21hdGNoJywgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9yZXF1ZXN0cy97cmVxdWVzdElkfS9pc3N1ZScsICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuXHJcbiAgICAgICAgLy8gU2NyaWJlRmlyc3QgUGhhc2UgMSDigJQgU09BUCBzY3JpYmUgcm91dGVzXHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMve2lkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgc2NyaWJlRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zL3tpZH0vc29hcCcsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHNjcmliZUZuKTtcclxuICAgICAgICByb3V0ZSgnL3NjcmliZS9zZXNzaW9ucy97aWR9L2FwcHJvdmUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFMzICsgQ2xvdWRGcm9udFxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFGcm9udGVuZEJ1Y2tldCcsIHtcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFEYXRhS2V5LFxyXG4gICAgICAgICAgICBidWNrZXRLZXlFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGFjY2Vzc0xvZ3NCdWNrZXQsXHJcbiAgICAgICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NQcmVmaXg6ICdzMy1hY2Nlc3MvZnJvbnRlbmQvJyxcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ2V4cGlyZS1ub25jdXJyZW50LXZlcnNpb25zJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMTgwKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG9hYyA9IG5ldyBjbG91ZGZyb250LlMzT3JpZ2luQWNjZXNzQ29udHJvbCh0aGlzLCAnVGlyeWFxT0FDJywge1xyXG4gICAgICAgICAgICBzaWduaW5nOiBjbG91ZGZyb250LlNpZ25pbmcuU0lHVjRfTk9fT1ZFUlJJREVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdUaXJ5YXFEaXN0cmlidXRpb24nLCB7XHJcbiAgICAgICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgICAgICAgICAgb3JpZ2luOiBjbG91ZGZyb250T3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChzaXRlQnVja2V0LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luQWNjZXNzQ29udHJvbDogb2FjXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBWaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICAgICAgICAgIGNhY2hlUG9saWN5OiBDYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcclxuICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBBbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kuU0VDVVJJVFlfSEVBREVSU1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICBtaW5pbXVtUHJvdG9jb2xWZXJzaW9uOiBjbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAyMSxcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZSByZWdyZXNzaW9uOiBXQUYgdGVtcG9yYXJpbHkgZGlzYWJsZWQgdG8gc3RvcCBjaGFyZ2VzLlxyXG4gICAgICAgICAgICAvLyBSZS1lbmFibGUgYnkgc2V0dGluZyB3ZWJBY2xJZCBiYWNrIHRvIHByb3BzPy53ZWJBY2xBcm4gYW5kXHJcbiAgICAgICAgICAgIC8vIHJlLWluc3RhdGluZyB0aGUgVGlyeWFxRWRnZVN0YWNrIGluIGJpbi90aXJ5YXEtY2RrLnRzLlxyXG4gICAgICAgICAgICAvLyB3ZWJBY2xJZDogcHJvcHM/LndlYkFjbEFybixcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgYXVkaXQgdHJhaWwg4oCUIGxvZyBldmVyeSBDbG91ZEZyb250IHJlcXVlc3RcclxuICAgICAgICAgICAgLy8gKHZpZXdlciBJUCwgcmVxdWVzdCBVUkksIHJlc3BvbnNlIHN0YXR1cykuIFNlbnQgdG8gdGhlXHJcbiAgICAgICAgICAgIC8vIHNlcnZpY2UtbG9ncyBidWNrZXQgYmVjYXVzZSBDbG91ZEZyb250IGNhbm5vdCBkZWxpdmVyIHRvIGFuXHJcbiAgICAgICAgICAgIC8vIFNTRS1LTVMgZGVzdGluYXRpb24uXHJcbiAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXHJcbiAgICAgICAgICAgIGxvZ0J1Y2tldDogYWNjZXNzTG9nc0J1Y2tldCxcclxuICAgICAgICAgICAgbG9nRmlsZVByZWZpeDogJ2Nsb3VkZnJvbnQvJyxcclxuICAgICAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICAgICAgICAgIHsgaHR0cFN0YXR1czogNDAzLCByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCwgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBodHRwU3RhdHVzOiA0MDQsIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLCByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnIH1cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgY29tbWVudDogJ1RpcnlhcSBIb3NwaXRhbCBQbGF0Zm9ybSdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2l0ZUJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYCR7c2l0ZUJ1Y2tldC5idWNrZXRBcm59LypgXSxcclxuICAgICAgICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZnJvbnQuYW1hem9uYXdzLmNvbScpXSxcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ0FXUzpTb3VyY2VBcm4nOiBgYXJuOmF3czpjbG91ZGZyb250Ojoke2FjY291bnRJZH06ZGlzdHJpYnV0aW9uLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkfWBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRG9jdW1lbnRzIGJ1Y2tldCAob3duZWQgYnkgVEhJUyBhY2NvdW50KVxyXG4gICAgICAgIC8vIFRoZSBvbGQgYHRpcnlhcS1kb2N1bWVudHNgIG5hbWUgYmVsb25ncyB0byBhIGRpZmZlcmVudCBhY2NvdW50LCB3aGljaFxyXG4gICAgICAgIC8vIGlzIHdoeSBDT1JTIGNvdWxkIG5ldmVyIGJlIHNldC4gV2UgY3JlYXRlIG91ciBvd24gYWNjb3VudC1zY29wZWRcclxuICAgICAgICAvLyBidWNrZXQgYW5kIGRlY2xhcmUgQ09SUyBhcyBhIHByb3BlcnR5IHNvIGJyb3dzZXLihpJTMyBwcmUtc2lnbmVkIFBVVC9HRVRcclxuICAgICAgICAvLyB1cGxvYWRzIGFyZSBhbGxvd2VkLiBUaGUgTGFtYmRhIHJlYWRzIHRoZSBuYW1lIGZyb20gRE9DVU1FTlRTX0JVQ0tFVC5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBkb2N1bWVudHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUaXJ5YXFEb2N1bWVudHNCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtZG9jdW1lbnRzLSR7YWNjb3VudElkfS0ke3JlZ2lvbn1gLFxyXG4gICAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBjb3JzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULCBzMy5IdHRwTWV0aG9kcy5QVVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLkhFQURdLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAnQ29udGVudC1MZW5ndGgnLCAnQ29udGVudC1UeXBlJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4QWdlOiAzNjAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIGRvY3VtZW50TWFuYWdlckZuLmFkZEVudmlyb25tZW50KCdET0NVTUVOVFNfQlVDS0VUJywgZG9jdW1lbnRzQnVja2V0LmJ1Y2tldE5hbWUpO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBPdXRwdXRzXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHsgdmFsdWU6IGFwaS5hcGlFbmRwb2ludCwgZGVzY3JpcHRpb246ICdIVFRQIEFQSSBVUkwg4oaSIHVwZGF0ZSBDb25maWcudHMgdGlyeWFxVXJsJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVybCcsIHsgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCwgZGVzY3JpcHRpb246ICdGcm9udGVuZCBVUkwg4oaSIHVwZGF0ZSBjYWxsYmFja1VybHMgKyBsb2dvdXRVcmxzIHRoZW4gcmVkZXBsb3knIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7IHZhbHVlOiBzaXRlQnVja2V0LmJ1Y2tldE5hbWUsIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IOKGkiBuZyBidWlsZCArIGF3cyBzMyBzeW5jJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHsgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQg4oaSIHVwZGF0ZSBhcHAuY29uZmlnLnRzIGF1dGhvcml0eScgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcENsaWVudElkJywgeyB2YWx1ZTogYXBwQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBBcHAgQ2xpZW50IElEIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cyBjbGllbnRJZCcgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywgeyB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLCBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEIOKGkiBjYWNoZSBpbnZhbGlkYXRpb24nIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2duaXRvQXV0aG9yaXR5JywgeyB2YWx1ZTogYGh0dHBzOi8vY29nbml0by1pZHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHt1c2VyUG9vbC51c2VyUG9vbElkfWAsIGRlc2NyaXB0aW9uOiAnQ29nbml0byBhdXRob3JpdHkgVVJMIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cycgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RvY3VtZW50c0J1Y2tldE5hbWUnLCB7IHZhbHVlOiBkb2N1bWVudHNCdWNrZXQuYnVja2V0TmFtZSwgZGVzY3JpcHRpb246ICdEb2N1bWVudHMgYnVja2V0ICh1cGxvYWRzIHZpYSBwcmUtc2lnbmVkIFVSTHMpJyB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=