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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWNkay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpcnlhcS1jZGstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELHNFQUF3RDtBQUN4RCx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELDhFQUFnRTtBQU1oRSwrREFBK0Y7QUFDL0YsNkZBQWtGO0FBQ2xGLDJGQUE2RTtBQUc3RSxNQUFNLFdBQVcsR0FBRztJQUNoQixvQkFBb0I7SUFDcEIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1oseUJBQXlCO0lBQ3pCLFlBQVk7SUFDWixXQUFXO0lBQ1gsYUFBYTtJQUNiLFdBQVc7SUFDWCxXQUFXO0lBQ1gsZ0JBQWdCO0lBQ2hCLFlBQVk7SUFDWixhQUFhO0lBQ2IsZUFBZTtJQUNmLHlCQUF5QjtJQUN6QixTQUFTO0lBQ1QsVUFBVTtJQUNWLFlBQVk7SUFDWixhQUFhO0lBQ2Isa0JBQWtCO0lBQ2xCLGVBQWU7SUFDZixjQUFjO0lBQ2Qsb0JBQW9CO0lBQ3BCLFlBQVk7SUFDWixvQ0FBb0M7SUFDcEMsVUFBVTtJQUNWLFNBQVM7SUFDVCxnQkFBZ0I7Q0FDbkIsQ0FBQztBQUVGLE1BQU0sZUFBZSxHQUFHO0lBQ3BCLG1DQUFtQztJQUNuQyxZQUFZO0lBQ1osa0JBQWtCO0lBQ2xCLDBCQUEwQjtJQUMxQixZQUFZO0lBQ1osb0NBQW9DO0lBQ3BDLGNBQWM7SUFDZCxZQUFZO0lBQ1osb0JBQW9CO0lBQ3BCLG9CQUFvQjtJQUNwQixpQkFBaUI7SUFDakIsd0JBQXdCO0lBQ3hCLGNBQWM7SUFDZCxvQkFBb0I7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RUFBRSxvQ0FBb0MsRUFBRSxDQUFDLENBQUM7UUFDN0gsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsdURBQXVELEVBQUUsQ0FBQyxDQUFDO1FBQzVJLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsdURBQXVELEVBQUUsQ0FBQyxDQUFDO1FBQ3BKLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLGNBQWMsRUFBRSxXQUFXLEVBQUUsaURBQWlELEVBQUUsQ0FBQyxDQUFDO1FBQ2xKLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLE1BQU0sa0JBQWtCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsOENBQThDLEVBQUUsQ0FBQyxDQUFDO1FBQzFMLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsZ0RBQWdELEVBQUUsQ0FBQyxDQUFDO0lBQ3pKLENBQUM7Q0FDSjtBQXg5QkQsa0NBdzlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250T3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkdHJhaWwgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkdHJhaWwnO1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyBldmVudHNUYXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRpcnlhcVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgICAvKiogQVJOIG9mIHRoZSBDbG91ZEZyb250LXNjb3BlZCBXQUZ2MiBXZWJBQ0wgY3JlYXRlZCBpbiB0aGUgZWRnZSAodXMtZWFzdC0xKSBzdGFjay4gKi9cclxuICAgIHdlYkFjbEFybj86IHN0cmluZztcclxufVxyXG5pbXBvcnQgeyBWaWV3ZXJQcm90b2NvbFBvbGljeSwgQWxsb3dlZE1ldGhvZHMsIENhY2hlUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IEh0dHBKd3RBdXRob3JpemVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuY29uc3QgREVQQVJUTUVOVFMgPSBbXHJcbiAgICAnRW1lcmdlbmN5IE1lZGljaW5lJyxcclxuICAgICdJbnRlcm5hbCBNZWRpY2luZScsXHJcbiAgICAnR2VuZXJhbCBTdXJnZXJ5JyxcclxuICAgICdQZWRpYXRyaWNzJyxcclxuICAgICdPYnN0ZXRyaWNzICYgR3luZWNvbG9neScsXHJcbiAgICAnQ2FyZGlvbG9neScsXHJcbiAgICAnTmV1cm9sb2d5JyxcclxuICAgICdPcnRob3BlZGljcycsXHJcbiAgICAnUmFkaW9sb2d5JyxcclxuICAgICdQYXRob2xvZ3knLFxyXG4gICAgJ0FuZXN0aGVzaW9sb2d5JyxcclxuICAgICdQc3ljaGlhdHJ5JyxcclxuICAgICdEZXJtYXRvbG9neScsXHJcbiAgICAnT3BodGhhbG1vbG9neScsXHJcbiAgICAnRWFyIE5vc2UgJiBUaHJvYXQgKEVOVCknLFxyXG4gICAgJ1Vyb2xvZ3knLFxyXG4gICAgJ09uY29sb2d5JyxcclxuICAgICdOZXBocm9sb2d5JyxcclxuICAgICdQdWxtb25vbG9neScsXHJcbiAgICAnR2FzdHJvZW50ZXJvbG9neScsXHJcbiAgICAnRW5kb2NyaW5vbG9neScsXHJcbiAgICAnUmhldW1hdG9sb2d5JyxcclxuICAgICdJbmZlY3Rpb3VzIERpc2Vhc2UnLFxyXG4gICAgJ0hlbWF0b2xvZ3knLFxyXG4gICAgJ1BoeXNpY2FsIE1lZGljaW5lICYgUmVoYWJpbGl0YXRpb24nLFxyXG4gICAgJ1BoYXJtYWN5JyxcclxuICAgICdOdXJzaW5nJyxcclxuICAgICdBZG1pbmlzdHJhdGlvbidcclxuXTtcclxuXHJcbmNvbnN0IFNQRUNJQUxJWkFUSU9OUyA9IFtcclxuICAgICdHZW5lcmFsIChBZHVsdCkgSW50ZXJuYWwgTWVkaWNpbmUnLFxyXG4gICAgJ0NhcmRpb2xvZ3knLFxyXG4gICAgJ0dhc3Ryb2VudGVyb2xvZ3knLFxyXG4gICAgJ0VuZG9jcmlub2xvZ3kgJiBEaWFiZXRlcycsXHJcbiAgICAnTmVwaHJvbG9neScsXHJcbiAgICAnUHVsbW9ub2xvZ3kgJiBSZXNwaXJhdG9yeSBNZWRpY2luZScsXHJcbiAgICAnUmhldW1hdG9sb2d5JyxcclxuICAgICdIZW1hdG9sb2d5JyxcclxuICAgICdJbmZlY3Rpb3VzIERpc2Vhc2UnLFxyXG4gICAgJ0dlcmlhdHJpYyBNZWRpY2luZScsXHJcbiAgICAnR2VuZXJhbCBTdXJnZXJ5JyxcclxuICAgICdDYXJkaW90aG9yYWNpYyBTdXJnZXJ5JyxcclxuICAgICdOZXVyb3N1cmdlcnknLFxyXG4gICAgJ09ydGhvcGVkaWMgU3VyZ2VyeScsXHJcbiAgICAnUGxhc3RpYyAmIFJlY29uc3RydWN0aXZlIFN1cmdlcnknLFxyXG4gICAgJ1Zhc2N1bGFyIFN1cmdlcnknLFxyXG4gICAgJ1BlZGlhdHJpYyBTdXJnZXJ5JyxcclxuICAgICdVcm9sb2dpY2FsIFN1cmdlcnknLFxyXG4gICAgJ0VtZXJnZW5jeSBNZWRpY2luZScsXHJcbiAgICAnQ3JpdGljYWwgQ2FyZSBNZWRpY2luZScsXHJcbiAgICAnVHJhdW1hIFN1cmdlcnknLFxyXG4gICAgJ0dlbmVyYWwgUGVkaWF0cmljcycsXHJcbiAgICAnTmVvbmF0b2xvZ3knLFxyXG4gICAgJ1BlZGlhdHJpYyBDYXJkaW9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgTmV1cm9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgT25jb2xvZ3knLFxyXG4gICAgJ09ic3RldHJpY3MgJiBHeW5lY29sb2d5JyxcclxuICAgICdNYXRlcm5hbC1GZXRhbCBNZWRpY2luZScsXHJcbiAgICAnR3luZWNvbG9naWMgT25jb2xvZ3knLFxyXG4gICAgJ05ldXJvbG9neScsXHJcbiAgICAnUHN5Y2hpYXRyeScsXHJcbiAgICAnQ2xpbmljYWwgTmV1cm9waHlzaW9sb2d5JyxcclxuICAgICdSYWRpb2xvZ3kgJiBNZWRpY2FsIEltYWdpbmcnLFxyXG4gICAgJ051Y2xlYXIgTWVkaWNpbmUnLFxyXG4gICAgJ1BhdGhvbG9neSAmIExhYm9yYXRvcnkgTWVkaWNpbmUnLFxyXG4gICAgJ09waHRoYWxtb2xvZ3knLFxyXG4gICAgJ090b2xhcnluZ29sb2d5IChFTlQpJyxcclxuICAgICdEZXJtYXRvbG9neScsXHJcbiAgICAnU3BvcnRzIE1lZGljaW5lJyxcclxuICAgICdNZWRpY2FsIE9uY29sb2d5JyxcclxuICAgICdSYWRpYXRpb24gT25jb2xvZ3knLFxyXG4gICAgJ0FuZXN0aGVzaW9sb2d5JyxcclxuICAgICdQYWluIE1lZGljaW5lJyxcclxuICAgICdQYWxsaWF0aXZlIENhcmUnLFxyXG4gICAgJ0ZhbWlseSBNZWRpY2luZScsXHJcbiAgICAnT2NjdXBhdGlvbmFsIE1lZGljaW5lJyxcclxuICAgICdQdWJsaWMgSGVhbHRoJ1xyXG5dO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRpcnlhcVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogVGlyeWFxU3RhY2tQcm9wcykge1xyXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgICAgICBjb25zdCBhY2NvdW50SWQgPSBjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudDtcclxuICAgICAgICBjb25zdCByZWdpb24gPSBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkg4oCUIGVuY3J5cHRpb24gYXQgcmVzdCB3aXRoIGN1c3RvbWVyIGNvbnRyb2wuXHJcbiAgICAgICAgLy8gVHdvIENNS3M6XHJcbiAgICAgICAgLy8gICAtIHRpcnlhcURhdGFLZXkgIOKGkiBlbmNyeXB0cyBEeW5hbW9EQiBhbmQgdGhlIGZyb250ZW5kIFMzIGJ1Y2tldFxyXG4gICAgICAgIC8vICAgLSB0aXJ5YXFBdWRpdEtleSDihpIgZW5jcnlwdHMgdGhlIGF1ZGl0IGxvZyBidWNrZXQgKHNlcGFyYXRlZCBzb1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBsYW5lIGtleSBjb21wcm9taXNlIGRvZXMgbm90IGludmFsaWRhdGVcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgdGhlIGF1ZGl0IGNoYWluKVxyXG4gICAgICAgIC8vIEFubnVhbCBhdXRvbWF0aWMgcm90YXRpb247IGtleSBhZG1pbnMgbGltaXRlZCB0byB0aGUgZGVwbG95aW5nXHJcbiAgICAgICAgLy8gcHJpbmNpcGFsOyB1c2FnZSBsaW1pdGVkIHRvIHNwZWNpZmljIEFXUyBzZXJ2aWNlcyBpbiB0aGlzIGFjY291bnQuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdGlyeWFxRGF0YUtleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdUaXJ5YXFEYXRhS2V5Jywge1xyXG4gICAgICAgICAgICBhbGlhczogJ2FsaWFzL3RpcnlhcS9kYXRhJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDTUsgZm9yIFRpcnlhcSBEeW5hbW9EQiBhbmQgZnJvbnRlbmQgYnVja2V0IOKAlCBQRFBQTCBBcnQuIDkuJyxcclxuICAgICAgICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgcGVuZGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHRpcnlhcUF1ZGl0S2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1RpcnlhcUF1ZGl0S2V5Jywge1xyXG4gICAgICAgICAgICBhbGlhczogJ2FsaWFzL3RpcnlhcS9hdWRpdCcsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ01LIGZvciBUaXJ5YXEgYXVkaXQgbG9nIGJ1Y2tldCBhbmQgQ2xvdWRUcmFpbCDigJQgc2VncmVnYXRlZCBmcm9tIGRhdGEga2V5LicsXHJcbiAgICAgICAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBlbmRpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5kYXlzKDMwKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDbG91ZFRyYWlsICh0aGUgQVdTIHNlcnZpY2UpIG5lZWRzIHBlcm1pc3Npb24gdG8gdXNlIHRoZSBhdWRpdCBDTUtcclxuICAgICAgICAvLyB3aGVuIGl0IHdyaXRlcyBlbmNyeXB0ZWQgbG9nIGZpbGVzIGludG8gdGhlIGF1ZGl0IGJ1Y2tldC5cclxuICAgICAgICB0aXJ5YXFBdWRpdEtleS5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBzaWQ6ICdBbGxvd0Nsb3VkVHJhaWxFbmNyeXB0TG9ncycsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2ttczpHZW5lcmF0ZURhdGFLZXkqJywgJ2ttczpEZXNjcmliZUtleSddLFxyXG4gICAgICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWR0cmFpbC5hbWF6b25hd3MuY29tJyldLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHsgJ2F3czpTb3VyY2VBY2NvdW50JzogY2RrLkF3cy5BQ0NPVU5UX0lEIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBzZXBhcmF0ZSBcInNlcnZpY2UgYWNjZXNzIGxvZ3NcIiBidWNrZXQuXHJcbiAgICAgICAgLy8gUzMgc2VydmVyIGFjY2VzcyBsb2dnaW5nIGFuZCBDbG91ZEZyb250IHN0YW5kYXJkIGxvZ2dpbmcgYm90aFxyXG4gICAgICAgIC8vIHJlZnVzZSBTU0UtS01TIGRlc3RpbmF0aW9uIGJ1Y2tldHMsIHNvIHdlIGtlZXAgdGhlc2UgQVdTLXNlcnZpY2VcclxuICAgICAgICAvLyBsb2dzIGluIGEgZGVkaWNhdGVkIGJ1Y2tldCB3aXRoIFNTRS1TMyArIHZlcnNpb25pbmcgKyBsaWZlY3ljbGUuXHJcbiAgICAgICAgLy8gVGhlIGhpZ2gtYXNzdXJhbmNlIChDTUsgKyBPYmplY3QgTG9jaykgYnVja2V0IGJlbG93IGhvbGRzXHJcbiAgICAgICAgLy8gQ2xvdWRUcmFpbCBhbmQgZXhwb3J0ZWQgYXBwbGljYXRpb24gYXVkaXQgb25seS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhY2Nlc3NMb2dzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxQWNjZXNzTG9nc0J1Y2tldCcsIHtcclxuICAgICAgICAgICAgYnVja2V0TmFtZTogYHRpcnlhcS1hY2Nlc3MtbG9ncy0ke2FjY291bnRJZH0tJHtyZWdpb259YCxcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG9iamVjdE93bmVyc2hpcDogczMuT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9QUkVGRVJSRUQsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ3RyYW5zaXRpb24tYW5kLWV4cGlyZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLCB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApIH1cclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDI1NTUpIC8vIDcgeWVhcnNcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkgKyBNT1BIIGF1ZGl0IHRyYWlsLlxyXG4gICAgICAgIC8vIEltbXV0YWJsZSBhdWRpdCBsb2cgYnVja2V0IOKAlCBPYmplY3QgTG9jayBpbiBjb21wbGlhbmNlIG1vZGUgcHJldmVudHNcclxuICAgICAgICAvLyB0YW1wZXJpbmcgb3IgZGVsZXRpb24gb2YgYXVkaXQgcmVjb3JkcywgZXZlbiBieSBhY2NvdW50IGFkbWlucy5cclxuICAgICAgICAvLyA3LXllYXIgcmV0ZW50aW9uIGFsaWducyB3aXRoIFFhdGFyIGhlYWx0aGNhcmUgcmVjb3JkLWtlZXBpbmcgbm9ybXMuXHJcbiAgICAgICAgLy8gVmVyc2lvbmluZyBpcyBtYW5kYXRvcnkgZm9yIE9iamVjdCBMb2NrLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGF1ZGl0QnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxQXVkaXRCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtYXVkaXQtJHthY2NvdW50SWR9LSR7cmVnaW9ufWAsXHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFBdWRpdEtleSxcclxuICAgICAgICAgICAgYnVja2V0S2V5RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICAgICAgICBvYmplY3RMb2NrRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgb2JqZWN0TG9ja0RlZmF1bHRSZXRlbnRpb246IHMzLk9iamVjdExvY2tSZXRlbnRpb24uY29tcGxpYW5jZShjZGsuRHVyYXRpb24uZGF5cygyNTU1KSksIC8vIDcgeWVhcnNcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndHJhbnNpdGlvbi10by1nbGFjaWVyJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUiwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCkgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgbm9uY3VycmVudFZlcnNpb25UcmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkRFRVBfQVJDSElWRSwgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygxODApIH1cclxuICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgKyBOQ1NBIE5JQSDigJQgaW5mcmFzdHJ1Y3R1cmUtbGV2ZWwgYXVkaXQuXHJcbiAgICAgICAgLy8gTXVsdGktcmVnaW9uIHRyYWlsIHdpdGggbG9nIGZpbGUgdmFsaWRhdGlvbi4gQ2FwdHVyZXMgZXZlcnkgQVdTIEFQSVxyXG4gICAgICAgIC8vIGNhbGwgKGNvbnRyb2wgcGxhbmUpLiBTZW50IHRvIHRoZSBpbW11dGFibGUgYXVkaXQgYnVja2V0IGFib3ZlLlxyXG4gICAgICAgIC8vIFMzIGRhdGEgZXZlbnRzIGNhcHR1cmVkIGZvciB0aGUgZnJvbnRlbmQgYnVja2V0IHNvIHdlIGNhbiBwcm92ZVxyXG4gICAgICAgIC8vIHdobyBkb3dubG9hZGVkIHdoYXQgKFBISSBhY2Nlc3MgcGF0aCB0aHJvdWdoIHByZS1zaWduZWQgVVJMcykuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdHJhaWwgPSBuZXcgY2xvdWR0cmFpbC5UcmFpbCh0aGlzLCAnVGlyeWFxQ2xvdWRUcmFpbCcsIHtcclxuICAgICAgICAgICAgdHJhaWxOYW1lOiAndGlyeWFxLWNsb3VkdHJhaWwnLFxyXG4gICAgICAgICAgICBidWNrZXQ6IGF1ZGl0QnVja2V0LFxyXG4gICAgICAgICAgICBzM0tleVByZWZpeDogJ2Nsb3VkdHJhaWwnLFxyXG4gICAgICAgICAgICBpc011bHRpUmVnaW9uVHJhaWw6IHRydWUsXHJcbiAgICAgICAgICAgIGluY2x1ZGVHbG9iYWxTZXJ2aWNlRXZlbnRzOiB0cnVlLFxyXG4gICAgICAgICAgICBlbmFibGVGaWxlVmFsaWRhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgc2VuZFRvQ2xvdWRXYXRjaExvZ3M6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hMb2dzUmV0ZW50aW9uOiBjZGsuYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfWUVBUixcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxQXVkaXRLZXlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRHluYW1vREJcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIElNUE9SVEFOVCDigJQgR1NJIERFUExPWU1FTlQgUlVMRTpcclxuICAgICAgICAvLyBEeW5hbW9EQiBvbmx5IGFsbG93cyBPTkUgR1NJIHRvIGJlIGNyZWF0ZWQgcGVyIHRhYmxlIHVwZGF0ZS5cclxuICAgICAgICAvLyBUaGlzIG1lYW5zIG9uIGEgRlJFU0ggZGVwbG95IChuZXcgYWNjb3VudCksIGFsbCA3IEdTSXMgd2lsbCBiZVxyXG4gICAgICAgIC8vIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5IGJlY2F1c2UgQ0RLIGNyZWF0ZXMgdGhlIHRhYmxlICsgYWxsIEdTSXNcclxuICAgICAgICAvLyBpbiB0aGUgaW5pdGlhbCBDUkVBVEUgb3BlcmF0aW9uIChub3QgYW4gVVBEQVRFKS5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIEhvd2V2ZXIgaWYgeW91IGFkZCBhIE5FVyBHU0kgdG8gYW4gZXhpc3RpbmcgdGFibGUgdmlhIGNkayBkZXBsb3ksXHJcbiAgICAgICAgLy8geW91IE1VU1QgYWRkIG9ubHkgb25lIGF0IGEgdGltZSDigJQgb3RoZXJ3aXNlIENsb3VkRm9ybWF0aW9uIHdpbGxcclxuICAgICAgICAvLyBmYWlsIHdpdGggXCJDYW5ub3QgcGVyZm9ybSBtb3JlIHRoYW4gb25lIEdTSSBjcmVhdGlvbiBvciBkZWxldGlvblxyXG4gICAgICAgIC8vIGluIGEgc2luZ2xlIHVwZGF0ZVwiLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gQ3VycmVudCBHU0lzIChhbGwgY3JlYXRlZCBvbiBmcmVzaCBkZXBsb3kpOlxyXG4gICAgICAgIC8vICAgMS4gRW50aXR5VHlwZS1pbmRleCAgICAgICAgICDigJQgbWFpbiBxdWVyeSBpbmRleFxyXG4gICAgICAgIC8vICAgMi4gUGF0aWVudElELWluZGV4ICAgICAgICAgICDigJQgcGF0aWVudC1yZWxhdGVkIHF1ZXJpZXNcclxuICAgICAgICAvLyAgIDMuIGVtYWlsLWluZGV4ICAgICAgICAgICAgICAg4oCUIGxvb2t1cCBieSBlbWFpbFxyXG4gICAgICAgIC8vICAgNC4gZG9jdG9yRW1haWwtY3JlYXRlZEF0LWluZGV4IOKAlCBkb2N0b3IgZW1haWwgKyBkYXRlIHF1ZXJpZXNcclxuICAgICAgICAvLyAgIDUuIEdTSTEgICAgICAgICAgICAgICAgICAgICAg4oCUIGdlbmVyaWMgR1NJIChHU0kxUEsgKyBHU0kxU0spXHJcbiAgICAgICAgLy8gICA2LiBHU0kyICAgICAgICAgICAgICAgICAgICAgIOKAlCBuYW1lIHNlYXJjaCAobmFtZV9wcmVmaXggKyBuYW1lX2xvd2VyKVxyXG4gICAgICAgIC8vICAgNy4gZGF0YUNsYXNzLWluZGV4ICAgICAgICAgICDigJQgUERQUEwgYnJlYWNoIHNjb3BpbmcgKFVwZGF0ZSAwNilcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIENvbXBsaWFuY2Ug4oCUIGV2ZXJ5IGl0ZW0gd3JpdHRlbiB0byB0aGlzIHRhYmxlIFNIT1VMRCBpbmNsdWRlIGFcclxuICAgICAgICAvLyBgZGF0YUNsYXNzYCBhdHRyaWJ1dGUgZHJhd24gZnJvbSB7IFBISSwgUElJLCBQVUJMSUMsIEFVRElULCBTWVNURU0gfVxyXG4gICAgICAgIC8vIGFuZCBhbiBPUFRJT05BTCBgZXhwaXJlc0F0YCAoZXBvY2ggc2Vjb25kcykgYXR0cmlidXRlIHRoYXQgRHluYW1vREJcclxuICAgICAgICAvLyBUVEwgd2lsbCB1c2UgdG8gYXV0by1wdXJnZSB0cmFuc2llbnQgcmVjb3Jkcy5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnSG9zcGl0YWxUYWJsZScsIHtcclxuICAgICAgICAgICAgdGFibGVOYW1lOiAnSG9zcGl0YWwnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7IHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uS2V5OiB0aXJ5YXFEYXRhS2V5LFxyXG4gICAgICAgICAgICBkZWxldGlvblByb3RlY3Rpb246IHRydWUsXHJcbiAgICAgICAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICdleHBpcmVzQXQnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnRW50aXR5VHlwZS1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRW50aXR5VHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdQYXRpZW50SUQtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3BhdGllbnRJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ2VtYWlsLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdlbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZG9jdG9yRW1haWwtY3JlYXRlZEF0LWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkb2N0b3JFbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdHU0kxJyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdHU0kxUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdHU0kxU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnR1NJMicsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbmFtZV9wcmVmaXgnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICduYW1lX2xvd2VyJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBicmVhY2ggc2NvcGluZyArIE5DU0EgTklBIGRhdGEgY2xhc3NpZmljYXRpb24uXHJcbiAgICAgICAgLy8gTGV0cyB1cyBhbnN3ZXIgXCJzaG93IG1lIGV2ZXJ5IFBISSByZWNvcmQgdG91Y2hlZCBiZXR3ZWVuIHQxIGFuZCB0MlwiXHJcbiAgICAgICAgLy8gd2l0aG91dCBhIGZ1bGwgdGFibGUgc2NhbiBkdXJpbmcgYSBmb3JlbnNpYyBpbnZlc3RpZ2F0aW9uLlxyXG4gICAgICAgIC8vIFNvcnQga2V5ID0gdXBkYXRlZEF0IHNvIHdlIGdldCBpdGVtcyBpbiBjaHJvbm9sb2dpY2FsIG9yZGVyLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnZGF0YUNsYXNzLWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkYXRhQ2xhc3MnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1cGRhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuS0VZU19PTkxZXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvZ25pdG8gVXNlciBQb29sXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5ICsgTU9QSCBhY2Nlc3MtY29udHJvbCBleHBlY3RhdGlvbnMuXHJcbiAgICAgICAgLy8gLSBQYXNzd29yZCBwb2xpY3kgYWxpZ25lZCB3aXRoIE5DU0EgTklBOiAxMiBjaGFycyBtaW4sIGFsbCBjbGFzc2VzLlxyXG4gICAgICAgIC8vIC0gVGVtcG9yYXJ5IHBhc3N3b3JkIHZhbGlkaXR5IHJlZHVjZWQgdG8gMyBkYXlzIChmb3JjZSByb3RhdGlvbikuXHJcbiAgICAgICAgLy8gLSBNRkEgUkVRVUlSRUQgZm9yIGV2ZXJ5IHVzZXI7IFRPVFAgcHJlZmVycmVkLCBTTVMgZmFsbGJhY2suXHJcbiAgICAgICAgLy8gLSBBZHZhbmNlZCBTZWN1cml0eSBhdWRpdHMgKENvZ25pdG8gdGhyZWF0IHByb3RlY3Rpb24pIGVuZm9yY2VkLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1RpcnlhcVVzZXJQb29sJywge1xyXG4gICAgICAgICAgICB1c2VyUG9vbE5hbWU6ICd0aXJ5YXEtdXNlci1wb29sJyxcclxuICAgICAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBzaWduSW5BbGlhc2VzOiB7IHVzZXJuYW1lOiB0cnVlLCBlbWFpbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgZW1haWw6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIGZ1bGxuYW1lOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBnZW5kZXI6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHBob25lTnVtYmVyOiB7IHJlcXVpcmVkOiBmYWxzZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgYmlydGhkYXRlOiB7IHJlcXVpcmVkOiBmYWxzZSwgbXV0YWJsZTogdHJ1ZSB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHBhc3N3b3JkUG9saWN5OiB7XHJcbiAgICAgICAgICAgICAgICBtaW5MZW5ndGg6IDEyLFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0ZW1wUGFzc3dvcmRWYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMylcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gQ29tcGxpYW5jZSByZWdyZXNzaW9uOiBNRkEgZnVsbHkgZGlzYWJsZWQgKFJFUVVJUkVEIC0+IE9QVElPTkFMXHJcbiAgICAgICAgICAgIC8vIC0+IE9GRikgYnkgcmVxdWVzdC4gVGhlIHR3by1zdGVwIHBhdGggd2FzIG5lZWRlZCBiZWNhdXNlXHJcbiAgICAgICAgICAgIC8vIENvZ25pdG8gcmVmdXNlcyBSRVFVSVJFRCAtPiBPRkYgZGlyZWN0bHkgb24gYSBsaXZlIHBvb2wuXHJcbiAgICAgICAgICAgIC8vIFJlLWVuYWJsZSBieSByZXN0b3JpbmcgTWZhLlJFUVVJUkVEIGFuZCByZS1kZXBsb3lpbmcuXHJcbiAgICAgICAgICAgIG1mYTogY29nbml0by5NZmEuT0ZGLFxyXG4gICAgICAgICAgICAvLyBtZmFTZWNvbmRGYWN0b3Igbm90IG5lZWRlZCB3aGVuIG1mYSBpcyBPRkYuXHJcbiAgICAgICAgICAgIC8vIG1mYVNlY29uZEZhY3RvcjogeyBzbXM6IHRydWUsIG90cDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcbiAgICAgICAgICAgIHN0YW5kYXJkVGhyZWF0UHJvdGVjdGlvbk1vZGU6IGNvZ25pdG8uU3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZS5GVUxMX0ZVTkNUSU9OLFxyXG4gICAgICAgICAgICBkZXZpY2VUcmFja2luZzoge1xyXG4gICAgICAgICAgICAgICAgY2hhbGxlbmdlUmVxdWlyZWRPbk5ld0RldmljZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRldmljZU9ubHlSZW1lbWJlcmVkT25Vc2VyUHJvbXB0OiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTlxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBhcHBDbGllbnQgPSB1c2VyUG9vbC5hZGRDbGllbnQoJ1RpcnlhcUFwcENsaWVudCcsIHtcclxuICAgICAgICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnVGlyeWFxJyxcclxuICAgICAgICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICAgICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBjdXN0b206IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb0F1dGg6IHtcclxuICAgICAgICAgICAgICAgIGZsb3dzOiB7IGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHNjb3BlczogW2NvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsIGNvZ25pdG8uT0F1dGhTY29wZS5FTUFJTCwgY29nbml0by5PQXV0aFNjb3BlLlBIT05FLCBjb2duaXRvLk9BdXRoU2NvcGUuUFJPRklMRV0sXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja1VybHM6IFsnaHR0cDovL2xvY2FsaG9zdDo0MjAwLycsICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQvJ10sXHJcbiAgICAgICAgICAgICAgICBsb2dvdXRVcmxzOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMC8nLCAnaHR0cHM6Ly9kNmk3aXdrbmtqMGJnLmNsb3VkZnJvbnQubmV0LyddXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGFjY2Vzc1Rva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgICAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHVzZXJQb29sLmFkZERvbWFpbignVGlyeWFxRG9tYWluJywge1xyXG4gICAgICAgICAgICBjb2duaXRvRG9tYWluOiB7IGRvbWFpblByZWZpeDogJ3RpcnlhcS1ob3NwaXRhbCcgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBbJ0FkbWluJywgJ0RldmVsb3BlcnMnLCAnRG9jdG9ycycsICdQaGFybWFjaXN0cyddLmZvckVhY2goKGdyb3VwTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICBuZXcgY29nbml0by5DZm5Vc2VyUG9vbEdyb3VwKHRoaXMsIGBHcm91cCR7Z3JvdXBOYW1lfWAsIHtcclxuICAgICAgICAgICAgICAgIHVzZXJQb29sSWQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICBncm91cE5hbWUsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYCR7Z3JvdXBOYW1lfSBncm91cGBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFByZSBUb2tlbiBHZW5lcmF0aW9uIExhbWJkYVxyXG4gICAgICAgIC8vIEluamVjdHMgZW1haWwgKyBuYW1lIGZyb20gQ29nbml0byB1c2VyIGF0dHJpYnV0ZXMgaW50byB0aGVcclxuICAgICAgICAvLyBBY2Nlc3MgVG9rZW4gY2xhaW1zIHNvIGFsbCBMYW1iZGEgZnVuY3Rpb25zIGNhbiBpZGVudGlmeSB0aGUgYWN0b3IuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgcHJlVG9rZW5GbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NvZ25pdG9QcmVUb2tlbkdlbmVyYXRpb24nLCB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ2NvZ25pdG8tcHJlLXRva2VuLWdlbmVyYXRpb24nLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jb2duaXRvLXByZS10b2tlbi1nZW5lcmF0aW9uJyksXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBwcmVUb2tlbkZuLmFkZFBlcm1pc3Npb24oJ0NvZ25pdG9JbnZva2UnLCB7XHJcbiAgICAgICAgICAgIHByaW5jaXBhbDogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjb2duaXRvLWlkcC5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgICAgICAgIHNvdXJjZUFybjogdXNlclBvb2wudXNlclBvb2xBcm5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgY2ZuVXNlclBvb2wgPSB1c2VyUG9vbC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjb2duaXRvLkNmblVzZXJQb29sO1xyXG4gICAgICAgIGNmblVzZXJQb29sLmxhbWJkYUNvbmZpZyA9IHtcclxuICAgICAgICAgICAgcHJlVG9rZW5HZW5lcmF0aW9uQ29uZmlnOiB7XHJcbiAgICAgICAgICAgICAgICBsYW1iZGFBcm46IHByZVRva2VuRm4uZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgICAgICAgICBsYW1iZGFWZXJzaW9uOiAnVjNfMCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFNoYXJlZCBMYW1iZGEgZW52aXJvbm1lbnQgKyBoZWxwZXJcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzaGFyZWRFbnYgPSB7XHJcbiAgICAgICAgICAgIFRBQkxFX05BTUU6ICdIb3NwaXRhbCcsXHJcbiAgICAgICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIExhbWJkYSBmYWN0b3J5LlxyXG4gICAgICAgIC8vIE1lbW9yeSBidW1wZWQgdG8gNTEyIE1CIGJ5IGRlZmF1bHQg4oCUIE5vZGUuanMgY29sZC1zdGFydCBzY2FsZXMgd2l0aFxyXG4gICAgICAgIC8vIENQVSB3aGljaCBpcyBhbGxvY2F0ZWQgcHJvcG9ydGlvbmFsbHkgdG8gbWVtb3J5OyA1MTIgTUIgcm91Z2hseVxyXG4gICAgICAgIC8vIGhhbHZlcyBjb2xkLXN0YXJ0IHRpbWUgdnMgdGhlIGRlZmF1bHQgMTI4IE1CIGFuZCBpcyBzdGlsbCBwZW5uaWVzL21vbnRoLlxyXG4gICAgICAgIGNvbnN0IGZuID0gKGlkOiBzdHJpbmcsIGZvbGRlcjogc3RyaW5nLCBoYW5kbGVyOiBzdHJpbmcsIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lID0gbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsIGV4dHJhRW52OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge30sIG9wdHM6IHsgbWVtb3J5U2l6ZT86IG51bWJlciB9ID0ge30pID0+XHJcbiAgICAgICAgICAgIG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgaWQsIHtcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogZm9sZGVyLFxyXG4gICAgICAgICAgICAgICAgcnVudGltZSxcclxuICAgICAgICAgICAgICAgIGhhbmRsZXIsXHJcbiAgICAgICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoYGxhbWJkYS8ke2ZvbGRlcn1gKSxcclxuICAgICAgICAgICAgICAgIGVudmlyb25tZW50OiB7IC4uLnNoYXJlZEVudiwgLi4uZXh0cmFFbnYgfSxcclxuICAgICAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgICAgICAgICAgIG1lbW9yeVNpemU6IG9wdHMubWVtb3J5U2l6ZSA/PyA1MTJcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIExhbWJkYSBmdW5jdGlvbnNcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBnZXRBbGxQYXRpZW50c0ZuID0gZm4oJ0dldEFsbFBhdGllbnRzJywgJ2dldEFsbFBhdGllbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRQYXRpZW50QnlJREZuID0gZm4oJ0dldFBhdGllbnRCeUlEJywgJ2dldFBhdGllbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVQYXRpZW50Rm4gPSBmbignQ3JlYXRlUGF0aWVudCcsICdjcmVhdGVQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCB1cGRhdGVQYXRpZW50Rm4gPSBmbignVXBkYXRlUGF0aWVudCcsICd1cGRhdGVQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVQYXRpZW50Rm4gPSBmbignRGVsZXRlUGF0aWVudCcsICdkZWxldGVQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnNGbiA9IGZuKCdHZXRQYXRpZW50c0RhdGFCeUZpbHRlcnMnLCAnZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxEb2N0b3JzRm4gPSBmbignR2V0QWxsRG9jdG9ycycsICdnZXRBbGxEb2N0b3JzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXREb2N0b3JCeUlERm4gPSBmbignR2V0RG9jdG9yQnlJRCcsICdnZXREb2N0b3JCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXREb2N0b3JCeUVtYWlsRm4gPSBmbignR2V0RG9jdG9yQnlFbWFpbCcsICdnZXREb2N0b3JCeUVtYWlsJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlRG9jdG9yRm4gPSBmbignQ3JlYXRlRG9jdG9yJywgJ2NyZWF0ZURvY3RvcicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgdXBkYXRlRG9jdG9yRm4gPSBmbignVXBkYXRlRG9jdG9yJywgJ3VwZGF0ZURvY3RvcicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlRG9jdG9yRm4gPSBmbignRGVsZXRlRG9jdG9yJywgJ2RlbGV0ZURvY3RvcicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlUGF0aWVudFBheW1lbnRGbiA9IGZuKCdDcmVhdGVQYXRpZW50UGF5bWVudCcsICdjcmVhdGVQYXRpZW50UGF5bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50Rm4gPSBmbignR2V0QWxsUGF5bWVudHNGb3JQYXRpZW50JywgJ2dldEFsbFBheW1lbnRzRm9yUGF0aWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SURGbiA9IGZuKCdMaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJRCcsICdsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgdXBkYXRlUGF0aWVudFBheW1lbnRGbiA9IGZuKCdVcGRhdGVQYXRpZW50UGF5bWVudCcsICd1cGRhdGVQYXRpZW50UGF5bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0UGF5bWVudEJ5SURGbiA9IGZuKCdHZXRQYXltZW50QnlJRCcsICdnZXRQYXltZW50QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlUGF5bWVudEZuID0gZm4oJ0RlbGV0ZVBheW1lbnQnLCAnZGVsZXRlUGF5bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsSW52b2ljZXNGbiA9IGZuKCdHZXRBbGxJbnZvaWNlcycsICdnZXRBbGxJbnZvaWNlcycsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZVBhdGllbnRTdXJnZXJ5Rm4gPSBmbignQ3JlYXRlUGF0aWVudFN1cmdlcnknLCAnY3JlYXRlUGF0aWVudFN1cmdlcnknLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGxpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJREZuID0gZm4oJ0xpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJRCcsICdsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFN1cmdlcnlCeUlERm4gPSBmbignR2V0U3VyZ2VyeUJ5SUQnLCAnZ2V0U3VyZ2VyeUJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbERlcGFydG1lbnRzRm4gPSBmbignR2V0QWxsRGVwYXJ0bWVudHMnLCAnZ2V0QWxsRGVwYXJ0bWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZU5ld0RlcGFydG1lbnRGbiA9IGZuKCdDcmVhdGVOZXdEZXBhcnRtZW50JywgJ2NyZWF0ZU5ld0RlcGFydG1lbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuID0gZm4oJ0J1bGtDcmVhdGVEZXBhcnRtZW50cycsICdidWxrQ3JlYXRlRGVwYXJ0bWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUFsbERlcGFydG1lbnRzRm4gPSBmbignRGVsZXRlQWxsRGVwYXJ0bWVudHMnLCAnZGVsZXRlQWxsRGVwYXJ0bWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbFNwZWNpYWxpemF0aW9uc0ZuID0gZm4oJ0dldEFsbFNwZWNpYWxpemF0aW9ucycsICdnZXRBbGxTcGVjaWFsaXphdGlvbnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZU5ld1NwZWNpYWxpemF0aW9uRm4gPSBmbignQ3JlYXRlTmV3U3BlY2lhbGl6YXRpb24nLCAnY3JlYXRlTmV3U3BlY2lhbGl6YXRpb24nLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbiA9IGZuKCdCdWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zJywgJ2J1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUFsbFNwZWNpYWxpemF0aW9uc0ZuID0gZm4oJ0RlbGV0ZUFsbFNwZWNpYWxpemF0aW9ucycsICdkZWxldGVBbGxTcGVjaWFsaXphdGlvbnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGFkbWluUGFuZWxGbiA9IGZuKCdUaXJ5YXFBZG1pblBhbmVsJywgJ3RpcnlhcS1hZG1pbi1wYW5lbCcsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gpO1xyXG4gICAgICAgIGNvbnN0IGV4YW1pbmF0aW9uc0ZuID0gZm4oJ1RpcnlhcUV4YW1pbmF0aW9ucycsICd0aXJ5YXEtZXhhbWluYXRpb25zJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgcGhhcm1hY3lGbiA9IGZuKCdUaXJ5YXFQaGFybWFjeScsICd0aXJ5YXEtcGhhcm1hY3knLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBkb2N1bWVudE1hbmFnZXJGbiA9IGZuKCdUaXJ5YXFEb2N1bWVudE1hbmFnZXInLCAndGlyeWFxLWRvY3VtZW50LW1hbmFnZXInLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBhdWRpdEZuID0gZm4oJ1RpcnlhcUF1ZGl0JywgJ3RpcnlhcS1hdWRpdCcsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGFwcG9pbnRtZW50c0ZuID0gZm4oJ1RpcnlhcUFwcG9pbnRtZW50cycsICd0aXJ5YXEtYXBwb2ludG1lbnRzJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgLy8gSG9zcGl0YWwgY2FsZW5kYXIg4oCUIHJlcGxhY2VzIHRoZSBwcmV2aW91cyBleHRlcm5hbCBDYWxlbmRhclBsYXRmb3JtIFNhYVMuXHJcbiAgICAgICAgLy8gQWxsIGNhbGVuZGFyIGRhdGEgbm93IHBlcnNpc3RzIGluIHRoZSBIb3NwaXRhbCBEeW5hbW9EQiB0YWJsZSBmb3JcclxuICAgICAgICAvLyBQRFBQTCBkYXRhLXJlc2lkZW5jeSArIGNsaW5pY2FsLXByaXZhY3kgY29tcGxpYW5jZS5cclxuICAgICAgICBjb25zdCBjYWxlbmRhckZuID0gZm4oJ1RpcnlhcUNhbGVuZGFyJywgJ3RpcnlhcS1jYWxlbmRhcicsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gpO1xyXG4gICAgICAgIC8vIEJsb29kIEJhbmsgbW9kdWxlIOKAlCBkb25vcnMgLyBkb25hdGlvbnMgLyBpbnZlbnRvcnkgLyByZXF1ZXN0cyAvIGNyb3NzbWF0Y2ggLyBpc3N1ZS5cclxuICAgICAgICBjb25zdCBibG9vZGJhbmtGbiA9IGZuKCdUaXJ5YXFCbG9vZGJhbmsnLCAndGlyeWFxLWJsb29kYmFuaycsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gpO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTY3JpYmVGaXJzdCBQaGFzZSAxIOKAlCBTT0FQIGdlbmVyYXRpb24gTGFtYmRhLlxyXG4gICAgICAgIC8vIENhbGxzIEJlZHJvY2sgZm9yIHRyYW5zY3JpcHQg4oaSIFNPQVAgc3BsaXQ7IHdyaXRlcyBzZXNzaW9uICsgYXVkaXRcclxuICAgICAgICAvLyByb3dzIHRvIHRoZSBleGlzdGluZyBzaW5nbGUtdGFibGUuXHJcbiAgICAgICAgLy8gQkVEUk9DS19SRUdJT04gY2FuIGRpZmZlciBmcm9tIEFXU19SRUdJT04gd2hlbiBCZWRyb2NrIGlzbid0IHlldFxyXG4gICAgICAgIC8vIGF2YWlsYWJsZSBpbiB0aGUgZGF0YS1wbGFuZSByZWdpb24gKGUuZy4gbWUtc291dGgtMSBwcm9kdWN0aW9uKS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzY3JpYmVGbiA9IGZuKFxyXG4gICAgICAgICAgICAnVGlyeWFxU2NyaWJlJyxcclxuICAgICAgICAgICAgJ3RpcnlhcS1zY3JpYmUnLFxyXG4gICAgICAgICAgICAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBCRURST0NLX1JFR0lPTjogJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgICAgICAgICAvLyBDbGF1ZGUgMy41IEhhaWt1IHZpYSB0aGUgVVMgY3Jvc3MtcmVnaW9uIGluZmVyZW5jZSBwcm9maWxlLlxyXG4gICAgICAgICAgICAgICAgLy8gVGhlIG9yaWdpbmFsIGNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3IG1vZGVsIHdhcyByZXRpcmVkL21hcmtlZFxyXG4gICAgICAgICAgICAgICAgLy8gbGVnYWN5IGJ5IHRoZSBwcm92aWRlciwgd2hpY2ggY2F1c2VkIEludm9rZU1vZGVsIEFjY2Vzc0RlbmllZC5cclxuICAgICAgICAgICAgICAgIC8vIE5ld2VyIEFudGhyb3BpYyBtb2RlbHMgb24gQmVkcm9jayBhcmUgb25seSBpbnZva2FibGUgdGhyb3VnaCBhblxyXG4gICAgICAgICAgICAgICAgLy8gaW5mZXJlbmNlIHByb2ZpbGUgKHRoZSBcInVzLlwiIHByZWZpeCksIG5vdCB0aGUgYmFyZSBtb2RlbCBJRC5cclxuICAgICAgICAgICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6ICd1cy5hbnRocm9waWMuY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMS12MTowJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgICAgICAvLyBBbGxvdyBCZWRyb2NrIEludm9rZU1vZGVsIG9uIHRoZSBDbGF1ZGUgMy41IEhhaWt1IFVTIGluZmVyZW5jZSBwcm9maWxlLlxyXG4gICAgICAgIC8vIEEgY3Jvc3MtcmVnaW9uIGluZmVyZW5jZSBwcm9maWxlIHJlcXVpcmVzIHBlcm1pc3Npb24gb24gQk9USCB0aGVcclxuICAgICAgICAvLyBwcm9maWxlIEFSTiBhbmQgdGhlIHVuZGVybHlpbmcgZm91bmRhdGlvbi1tb2RlbCBBUk5zIGluIGV2ZXJ5IHJlZ2lvblxyXG4gICAgICAgIC8vIHRoZSBwcm9maWxlIGNhbiByb3V0ZSB0byAodXMtZWFzdC0xIC8gdXMtZWFzdC0yIC8gdXMtd2VzdC0yKS5cclxuICAgICAgICBzY3JpYmVGbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnYmVkcm9jazpJbnZva2VNb2RlbCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgYGFybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6JHt0aGlzLmFjY291bnR9OmluZmVyZW5jZS1wcm9maWxlL3VzLmFudGhyb3BpYy5jbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxLXYxOjBgLFxyXG4gICAgICAgICAgICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxLXYxOjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxLXYxOjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtd2VzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxLXYxOjAnXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRHluYW1vREIgcGVybWlzc2lvbnNcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhbGxGdW5jdGlvbnMgPSBbXHJcbiAgICAgICAgICAgIGdldEFsbFBhdGllbnRzRm4sXHJcbiAgICAgICAgICAgIGdldFBhdGllbnRCeUlERm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZVBhdGllbnRGbixcclxuICAgICAgICAgICAgdXBkYXRlUGF0aWVudEZuLFxyXG4gICAgICAgICAgICBkZWxldGVQYXRpZW50Rm4sXHJcbiAgICAgICAgICAgIGdldFBhdGllbnRzRGF0YUJ5RmlsdGVyc0ZuLFxyXG4gICAgICAgICAgICBnZXRBbGxEb2N0b3JzRm4sXHJcbiAgICAgICAgICAgIGdldERvY3RvckJ5SURGbixcclxuICAgICAgICAgICAgZ2V0RG9jdG9yQnlFbWFpbEZuLFxyXG4gICAgICAgICAgICBjcmVhdGVEb2N0b3JGbixcclxuICAgICAgICAgICAgdXBkYXRlRG9jdG9yRm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZURvY3RvckZuLFxyXG4gICAgICAgICAgICBjcmVhdGVQYXRpZW50UGF5bWVudEZuLFxyXG4gICAgICAgICAgICBnZXRBbGxQYXltZW50c0ZvclBhdGllbnRGbixcclxuICAgICAgICAgICAgbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SURGbixcclxuICAgICAgICAgICAgdXBkYXRlUGF0aWVudFBheW1lbnRGbixcclxuICAgICAgICAgICAgZ2V0UGF5bWVudEJ5SURGbixcclxuICAgICAgICAgICAgZGVsZXRlUGF5bWVudEZuLFxyXG4gICAgICAgICAgICBnZXRBbGxJbnZvaWNlc0ZuLFxyXG4gICAgICAgICAgICBjcmVhdGVQYXRpZW50U3VyZ2VyeUZuLFxyXG4gICAgICAgICAgICBsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SURGbixcclxuICAgICAgICAgICAgZ2V0U3VyZ2VyeUJ5SURGbixcclxuICAgICAgICAgICAgZ2V0QWxsRGVwYXJ0bWVudHNGbixcclxuICAgICAgICAgICAgY3JlYXRlTmV3RGVwYXJ0bWVudEZuLFxyXG4gICAgICAgICAgICBidWxrQ3JlYXRlRGVwYXJ0bWVudHNGbixcclxuICAgICAgICAgICAgZGVsZXRlQWxsRGVwYXJ0bWVudHNGbixcclxuICAgICAgICAgICAgZ2V0QWxsU3BlY2lhbGl6YXRpb25zRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZU5ld1NwZWNpYWxpemF0aW9uRm4sXHJcbiAgICAgICAgICAgIGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbixcclxuICAgICAgICAgICAgZGVsZXRlQWxsU3BlY2lhbGl6YXRpb25zRm4sXHJcbiAgICAgICAgICAgIGFkbWluUGFuZWxGbixcclxuICAgICAgICAgICAgZXhhbWluYXRpb25zRm4sXHJcbiAgICAgICAgICAgIHBoYXJtYWN5Rm4sXHJcbiAgICAgICAgICAgIGRvY3VtZW50TWFuYWdlckZuLFxyXG4gICAgICAgICAgICBhdWRpdEZuLFxyXG4gICAgICAgICAgICBhcHBvaW50bWVudHNGbixcclxuICAgICAgICAgICAgY2FsZW5kYXJGbixcclxuICAgICAgICAgICAgYmxvb2RiYW5rRm4sXHJcbiAgICAgICAgICAgIHNjcmliZUZuXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgYWxsRnVuY3Rpb25zLmZvckVhY2goKGYpID0+IHtcclxuICAgICAgICAgICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGYpO1xyXG4gICAgICAgICAgICAvLyBDb21wbGlhbmNlOiBMYW1iZGEgZXhlY3V0aW9uIHJvbGVzIG11c3QgYmUgZXhwbGljaXRseSBncmFudGVkXHJcbiAgICAgICAgICAgIC8vIEtNUyBFbmNyeXB0L0RlY3J5cHQgb24gdGhlIGRhdGEgQ01LIGJlY2F1c2UgRHluYW1vREIgQ1VTVE9NRVJfTUFOQUdFRFxyXG4gICAgICAgICAgICAvLyBlbmNyeXB0aW9uIHJlcXVpcmVzIHRoZSBjYWxsZXIgcHJpbmNpcGFsIHRvIGhhdmUga2V5IGFjY2Vzcy5cclxuICAgICAgICAgICAgdGlyeWFxRGF0YUtleS5ncmFudEVuY3J5cHREZWNyeXB0KGYpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBMYW1iZGEgd2FybWVyIOKAlCBwaW5ncyBhdXRoLWNyaXRpY2FsIGFuZCBkYXNoYm9hcmQgTGFtYmRhcyBldmVyeSA1XHJcbiAgICAgICAgLy8gbWludXRlcyBzbyBmaXJzdC11c2VyLW9mLXRoZS1kYXkgZG9lc24ndCBwYXkgdGhlIGNvbGQtc3RhcnQgdGF4LlxyXG4gICAgICAgIC8vIEVhY2ggcGluZyBjb3N0cyAkMCAodGhlIExhbWJkYSBzaG9ydC1jaXJjdWl0cyBvbiBhIGBfd2FybXVwYCBldmVudCkuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gV2FybSBvbmx5IHRoZSBhdXRoLWNyaXRpY2FsICsgZGFzaGJvYXJkIExhbWJkYXMgKG1heCA1IHBlciBydWxlIOKAlFxyXG4gICAgICAgIC8vIEV2ZW50QnJpZGdlIGxpbWl0IOKAlCBhbmQga2VlcGluZyB0aGUgY291bnQgbG93IGJlY2F1c2Ugd2UncmUgbmVhclxyXG4gICAgICAgIC8vIHRoZSBDbG91ZEZvcm1hdGlvbiA1MDAtcmVzb3VyY2UtcGVyLXN0YWNrIGNlaWxpbmcpLiBUaGUgcmVzdCBvZlxyXG4gICAgICAgIC8vIHRoZSBMYW1iZGFzIGNhbiBjb2xkLXN0YXJ0IG9uIHRoZWlyIGZpcnN0IHVzZXItZHJpdmVuIGNhbGwuXHJcbiAgICAgICAgY29uc3Qgd2FybVRhcmdldHMgPSBbXHJcbiAgICAgICAgICAgIHByZVRva2VuRm4sICAgICAgICAgLy8gZXZlcnkgc2lnbi1pbiBnb2VzIHRocm91Z2ggdGhpc1xyXG4gICAgICAgICAgICBhcHBvaW50bWVudHNGbiwgICAgLy8gZGFzaGJvYXJkICsgYXBwb2ludG1lbnRzIHBhZ2VcclxuICAgICAgICAgICAgZ2V0QWxsUGF0aWVudHNGbiwgIC8vIGRhc2hib2FyZCArIHBhdGllbnRzIHBhZ2VcclxuICAgICAgICAgICAgZ2V0QWxsRG9jdG9yc0ZuLCAgIC8vIGRhc2hib2FyZCArIGRvY3RvcnMgcGFnZVxyXG4gICAgICAgICAgICBnZXRBbGxJbnZvaWNlc0ZuICAgLy8gZGFzaGJvYXJkICsgaW52b2ljZXMgcGFnZVxyXG4gICAgICAgIF0uZmlsdGVyKEJvb2xlYW4pIGFzIGxhbWJkYS5GdW5jdGlvbltdO1xyXG5cclxuICAgICAgICBjb25zdCB3YXJtZXJSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdUaXJ5YXFMYW1iZGFXYXJtZXInLCB7XHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnS2VlcHMgYXV0aCArIGRhc2hib2FyZCBMYW1iZGFzIHdhcm0gdG8gZWxpbWluYXRlIGNvbGQtc3RhcnQgbGF0ZW5jeS4nLFxyXG4gICAgICAgICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLnJhdGUoY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSkpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgd2FybVRhcmdldHMuZm9yRWFjaCgodGFyZ2V0LCBpKSA9PiB7XHJcbiAgICAgICAgICAgIHdhcm1lclJ1bGUuYWRkVGFyZ2V0KG5ldyBldmVudHNUYXJnZXRzLkxhbWJkYUZ1bmN0aW9uKHRhcmdldCwge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdCh7IF93YXJtdXA6IHRydWUsIGlkeDogaSB9KVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFNlZWQgTGFtYmRhIGFsc28gd3JpdGVzIHRvIHRoZSBlbmNyeXB0ZWQgdGFibGUuXHJcbiAgICAgICAgLy8gKGdyYW50ZWQgZnVydGhlciBkb3duIHdoZXJlIHNlZWRGbiBpcyBkZWZpbmVkLilcclxuXHJcbiAgICAgICAgYWRtaW5QYW5lbEZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpMaXN0VXNlcnMnLCAnY29nbml0by1pZHA6TGlzdFVzZXJzSW5Hcm91cCcsICdjb2duaXRvLWlkcDpBZG1pbkRpc2FibGVVc2VyJywgJ2NvZ25pdG8taWRwOkFkbWluRW5hYmxlVXNlcicsICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gRG9jdW1lbnRzIGJ1Y2tldCBhY2Nlc3MgaXMgZ3JhbnRlZCBvbiB0aGUgYnVja2V0IGNvbnN0cnVjdCBiZWxvd1xyXG4gICAgICAgIC8vIChzZWUgVGlyeWFxRG9jdW1lbnRzQnVja2V0KSwgc28gbm8gY3Jvc3MtYWNjb3VudCBpbmxpbmUgcG9saWN5IGhlcmUuXHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIFNlZWQgTGFtYmRhIOKAlCBkZXBhcnRtZW50cywgc3BlY2lhbGl6YXRpb25zLCBjb3VudGVyc1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHNlZWRGbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RpcnlhcVNlZWRGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAndGlyeWFxLXNlZWQnLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHsgVEFCTEVfTkFNRTogJ0hvc3BpdGFsJyB9LFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuY29uc3QgeyBEeW5hbW9EQkNsaWVudCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJyk7XHJcbmNvbnN0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvbGliLWR5bmFtb2RiJyk7XHJcbmNvbnN0IHsgcmFuZG9tVVVJRCB9ID0gcmVxdWlyZSgnY3J5cHRvJyk7XHJcbmNvbnN0IGNsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShuZXcgRHluYW1vREJDbGllbnQoe30pKTtcclxuY29uc3QgVEFCTEUgID0gcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRTtcclxuY29uc3QgREVQQVJUTUVOVFMgPSAke0pTT04uc3RyaW5naWZ5KERFUEFSVE1FTlRTKX07XHJcbmNvbnN0IFNQRUNJQUxJWkFUSU9OUyA9ICR7SlNPTi5zdHJpbmdpZnkoU1BFQ0lBTElaQVRJT05TKX07XHJcblxyXG4vLyBhdHRyaWJ1dGVfbm90X2V4aXN0cyhQSykgbWFrZXMgZXZlcnkgUHV0IGlkZW1wb3RlbnQg4oCUIGV4aXN0aW5nIHJvd3MgYXJlXHJcbi8vIHByZXNlcnZlZC4gVGhpcyBwcm90ZWN0cyB0aGUgcGF0aWVudC9kb2N0b3IgY291bnRlcnMgZnJvbSBiZWluZyByZXNldCBvblxyXG4vLyBhbnkgZnV0dXJlIHJlcGxheSBvZiB0aGlzIEN1c3RvbVJlc291cmNlLlxyXG5hc3luYyBmdW5jdGlvbiBwdXRJZkFic2VudChpdGVtKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IGNsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgICAgVGFibGVOYW1lOiBUQUJMRSxcclxuICAgICAgICAgICAgSXRlbTogaXRlbSxcclxuICAgICAgICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogJ2F0dHJpYnV0ZV9ub3RfZXhpc3RzKFBLKSdcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgaWYgKGUubmFtZSA9PT0gJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWRFeGNlcHRpb24nKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgdGhyb3cgZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgICAvLyBSZXF1ZXN0VHlwZSBoYW5kbGluZzpcclxuICAgIC8vICAgQ3JlYXRlIOKGkiBydW4gdGhlIGZ1bGwgc2VlZC5cclxuICAgIC8vICAgVXBkYXRlIOKGkiBOTy1PUC4gUmVmZXJlbmNlIGRhdGEgKGRlcGFydG1lbnRzLCBzcGVjaWFsaXphdGlvbnMpIGFuZFxyXG4gICAgLy8gICAgICAgICAgICBsaXZlIGNvdW50ZXJzIG11c3Qgbm90IGJlIHJlZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHkuIFRvXHJcbiAgICAvLyAgICAgICAgICAgIHJlLXNlZWQgaW50ZW50aW9uYWxseSwgcmVwbGFjZSB0aGlzIEN1c3RvbVJlc291cmNlIHZpYVxyXG4gICAgLy8gICAgICAgICAgICBjb25zb2xlIG9yIGJ1bXAgdGhlIGxvZ2ljYWwgaWQuXHJcbiAgICAvLyAgIERlbGV0ZSDihpIgTk8tT1AuIE5ldmVyIGRlc3Ryb3kgc2VlZGVkIHJlZmVyZW5jZSBkYXRhIG9uIHN0YWNrIGRlbGV0ZS5cclxuICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSAhPT0gJ0NyZWF0ZScpIHtcclxuICAgICAgICByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6ICdzZWVkJywgRGF0YTogeyBza2lwcGVkOiBldmVudC5SZXF1ZXN0VHlwZSB9IH07XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBsZXQgd3JpdHRlbiA9IDA7XHJcbiAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogJ0NPVU5URVIjUEFUSUVOVFMnLCBTSzogJ0NPVU5URVInLCBjb3VudDogMCwgRW50aXR5VHlwZTogJ0NPVU5URVInIH0pKSB3cml0dGVuKys7XHJcbiAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogJ0NPVU5URVIjRE9DVE9SUycsICBTSzogJ0NPVU5URVInLCBjb3VudDogMCwgRW50aXR5VHlwZTogJ0NPVU5URVInIH0pKSB3cml0dGVuKys7XHJcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgREVQQVJUTUVOVFMpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHJhbmRvbVVVSUQoKTtcclxuICAgICAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogXFxgREVQQVJUTUVOVCNcXCR7aWR9XFxgLCBTSzogJ1BST0ZJTEUnLCBFbnRpdHlUeXBlOiAnREVQQVJUTUVOVCcsIGRlcGFydG1lbnRJZDogaWQsIG5hbWUsIGNyZWF0ZWRBdDogbm93IH0pKSB3cml0dGVuKys7XHJcbiAgICB9XHJcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgU1BFQ0lBTElaQVRJT05TKSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSByYW5kb21VVUlEKCk7XHJcbiAgICAgICAgaWYgKGF3YWl0IHB1dElmQWJzZW50KHsgUEs6IFxcYFNQRUNJQUxJWkFUSU9OI1xcJHtpZH1cXGAsIFNLOiAnUFJPRklMRScsIEVudGl0eVR5cGU6ICdTUEVDSUFMSVpBVElPTicsIHNwZWNpYWxpemF0aW9uSWQ6IGlkLCBuYW1lLCBjcmVhdGVkQXQ6IG5vdyB9KSkgd3JpdHRlbisrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAnc2VlZCcsIERhdGE6IHsgd3JpdHRlbiB9IH07XHJcbn07XHJcbiAgICAgICAgICAgIGApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmdyYW50V3JpdGVEYXRhKHNlZWRGbik7XHJcbiAgICAgICAgdGlyeWFxRGF0YUtleS5ncmFudEVuY3J5cHREZWNyeXB0KHNlZWRGbik7XHJcbiAgICAgICAgY29uc3Qgc2VlZFByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdTZWVkUHJvdmlkZXInLCB7IG9uRXZlbnRIYW5kbGVyOiBzZWVkRm4gfSk7XHJcbiAgICAgICAgLy8gU3RhYmxlIHByb3BlcnR5IOKAlCBzYW1lIG9uIGV2ZXJ5IHN5bnRoIOKAlCBzbyBDbG91ZEZvcm1hdGlvbiBkb2VzIE5PVFxyXG4gICAgICAgIC8vIHJlLXRyaWdnZXIgYW4gVXBkYXRlIG9mIHRoZSBTZWVkRGF0YSBDdXN0b21SZXNvdXJjZSBvbiBgY2RrIGRlcGxveWAuXHJcbiAgICAgICAgLy8gUHJldmlvdXNseSBgdGltZXN0YW1wOiBEYXRlLm5vdygpYCBjYXVzZWQgdGhlIHNlZWQgTGFtYmRhIHRvIHJ1biBvblxyXG4gICAgICAgIC8vIGV2ZXJ5IGRlcGxveSwgcmVzZXR0aW5nIHBhdGllbnQvZG9jdG9yIGNvdW50ZXJzIGFuZCBkdXBsaWNhdGluZ1xyXG4gICAgICAgIC8vIGRlcGFydG1lbnQvc3BlY2lhbGl6YXRpb24gcmVjb3Jkcy5cclxuICAgICAgICBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsICdTZWVkRGF0YScsIHtcclxuICAgICAgICAgICAgc2VydmljZVRva2VuOiBzZWVkUHJvdmlkZXIuc2VydmljZVRva2VuLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHNlZWRWZXJzaW9uOiAxIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5IOKAlCBubyBzaGFyZWQgLyBoYXJkY29kZWQgY3JlZGVudGlhbHMuXHJcbiAgICAgICAgLy8gRWFjaCBzZWVkZWQgdXNlciBnZXRzIGEgQ1JZUFRPR1JBUEhJQ0FMTFkgUkFORE9NIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgICAgIC8vIHRoYXQgc2F0aXNmaWVzIHRoZSBzdHJlbmd0aGVuZWQgcGFzc3dvcmQgcG9saWN5LiBUaGUgcGFzc3dvcmQgaXM6XHJcbiAgICAgICAgLy8gICAtIGlzc3VlZCBhcyBURU1QT1JBUlkgKFBlcm1hbmVudD1mYWxzZSkgc28gQ29nbml0byBmb3JjZXMgYVxyXG4gICAgICAgIC8vICAgICBwYXNzd29yZCBjaGFuZ2UgYXQgZmlyc3QgbG9naW4sXHJcbiAgICAgICAgLy8gICAtIHN0b3JlZCBpbiBBV1MgU2VjcmV0cyBNYW5hZ2VyIHVuZGVyXHJcbiAgICAgICAgLy8gICAgIC90aXJ5YXEvc2VlZC11c2Vycy88dXNlcm5hbWU+LCBlbmNyeXB0ZWQgd2l0aCB0aGUgZGF0YSBDTUssXHJcbiAgICAgICAgLy8gICAtIG5ldmVyIGxvZ2dlZCwgbmV2ZXIgcmV0dXJuZWQgdG8gdGhlIEFQSSBjYWxsZXIuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdXNlcnNGbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RpcnlhcVVzZXJzRnVuY3Rpb24nLCB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ3RpcnlhcS1jcmVhdGUtdXNlcnMnLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgIERBVEFfS01TX0tFWV9JRDogdGlyeWFxRGF0YUtleS5rZXlJZFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuY29uc3QgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCwgQWRtaW5BZGRVc2VyVG9Hcm91cENvbW1hbmQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJyk7XHJcbmNvbnN0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIENyZWF0ZVNlY3JldENvbW1hbmQsIFB1dFNlY3JldFZhbHVlQ29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcicpO1xyXG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcclxuXHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoe30pO1xyXG5jb25zdCBzZWNyZXRzID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHt9KTtcclxuY29uc3QgUE9PTCA9IHByb2Nlc3MuZW52LlVTRVJfUE9PTF9JRDtcclxuY29uc3QgS0VZICA9IHByb2Nlc3MuZW52LkRBVEFfS01TX0tFWV9JRDtcclxuXHJcbmNvbnN0IFNFRURfVVNFUlMgPSBbXHJcbiAgICB7IHVzZXJuYW1lOiAnYWRtaW4xJywgICAgICBuYW1lOiAnQWRtaW4gT25lJywgICAgICBlbWFpbDogJ2FkbWluMUB0aXJ5YXEuY29tJywgICAgICBncm91cDogJ0FkbWluJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2FkbWluMicsICAgICAgbmFtZTogJ0FkbWluIFR3bycsICAgICAgZW1haWw6ICdhZG1pbjJAdGlyeWFxLmNvbScsICAgICAgZ3JvdXA6ICdBZG1pbicgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkZXZlbG9wZXIxJywgIG5hbWU6ICdEZXZlbG9wZXIgT25lJywgIGVtYWlsOiAnZGV2MUB0aXJ5YXEuY29tJywgICAgICAgIGdyb3VwOiAnRGV2ZWxvcGVycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkZXZlbG9wZXIyJywgIG5hbWU6ICdEZXZlbG9wZXIgVHdvJywgIGVtYWlsOiAnZGV2MkB0aXJ5YXEuY29tJywgICAgICAgIGdyb3VwOiAnRGV2ZWxvcGVycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkb2N0b3IxJywgICAgIG5hbWU6ICdEb2N0b3IgT25lJywgICAgIGVtYWlsOiAnZG9jdG9yMUB0aXJ5YXEuY29tJywgICAgIGdyb3VwOiAnRG9jdG9ycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdkb2N0b3IyJywgICAgIG5hbWU6ICdEb2N0b3IgVHdvJywgICAgIGVtYWlsOiAnZG9jdG9yMkB0aXJ5YXEuY29tJywgICAgIGdyb3VwOiAnRG9jdG9ycycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdwaGFybWFjaXN0MScsIG5hbWU6ICdQaGFybWFjaXN0IE9uZScsIGVtYWlsOiAncGhhcm1hY2lzdDFAdGlyeWFxLmNvbScsIGdyb3VwOiAnUGhhcm1hY2lzdHMnIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAncGhhcm1hY2lzdDInLCBuYW1lOiAnUGhhcm1hY2lzdCBUd28nLCBlbWFpbDogJ3BoYXJtYWNpc3QyQHRpcnlhcS5jb20nLCBncm91cDogJ1BoYXJtYWNpc3RzJyB9XHJcbl07XHJcblxyXG4vLyBHZW5lcmF0ZXMgYSAyMC1jaGFyIHBhc3N3b3JkIHRoYXQgYWx3YXlzIHNhdGlzZmllcyB0aGUgcG9saWN5OlxyXG4vLyB1cHBlciwgbG93ZXIsIGRpZ2l0LCBzeW1ib2wsIGxlbmd0aCA+PSAxMi5cclxuZnVuY3Rpb24gZ2VuZXJhdGVUZW1wUGFzc3dvcmQoKSB7XHJcbiAgICBjb25zdCB1cHBlciA9ICdBQkNERUZHSEpLTE1OUFFSU1RVVldYWVonO1xyXG4gICAgY29uc3QgbG93ZXIgPSAnYWJjZGVmZ2hpamttbnBxcnN0dXZ3eHl6JztcclxuICAgIGNvbnN0IGRpZ2l0ID0gJzIzNDU2Nzg5JztcclxuICAgIGNvbnN0IHN5bWJvbCA9ICchQCMkJV4mKigpLV89Kyc7XHJcbiAgICBjb25zdCBhbGwgPSB1cHBlciArIGxvd2VyICsgZGlnaXQgKyBzeW1ib2w7XHJcbiAgICBjb25zdCBwaWNrID0gKHNldCkgPT4gc2V0W2NyeXB0by5yYW5kb21JbnQoMCwgc2V0Lmxlbmd0aCldO1xyXG4gICAgbGV0IHB3ZCA9IHBpY2sodXBwZXIpICsgcGljayhsb3dlcikgKyBwaWNrKGRpZ2l0KSArIHBpY2soc3ltYm9sKTtcclxuICAgIHdoaWxlIChwd2QubGVuZ3RoIDwgMjApIHB3ZCArPSBwaWNrKGFsbCk7XHJcbiAgICByZXR1cm4gcHdkLnNwbGl0KCcnKS5zb3J0KCgpID0+IGNyeXB0by5yYW5kb21JbnQoMCwgMikgLSAxKS5qb2luKCcnKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc3RvcmVTZWNyZXQodXNlcm5hbWUsIHBhc3N3b3JkKSB7XHJcbiAgICBjb25zdCBuYW1lID0gJy90aXJ5YXEvc2VlZC11c2Vycy8nICsgdXNlcm5hbWU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHNlY3JldHMuc2VuZChuZXcgQ3JlYXRlU2VjcmV0Q29tbWFuZCh7XHJcbiAgICAgICAgICAgIE5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgIERlc2NyaXB0aW9uOiAnVGVtcG9yYXJ5IHBhc3N3b3JkIGZvciBzZWVkZWQgVGlyeWFxIHVzZXIg4oCUIG11c3QgYmUgY2hhbmdlZCBvbiBmaXJzdCBsb2dpbi4nLFxyXG4gICAgICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWUsIHRlbXBvcmFyeVBhc3N3b3JkOiBwYXNzd29yZCwgbXVzdENoYW5nZTogdHJ1ZSB9KSxcclxuICAgICAgICAgICAgS21zS2V5SWQ6IEtFWVxyXG4gICAgICAgIH0pKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBpZiAoZS5uYW1lID09PSAnUmVzb3VyY2VFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHNlY3JldHMuc2VuZChuZXcgUHV0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgICAgICAgICAgIFNlY3JldElkOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lLCB0ZW1wb3JhcnlQYXNzd29yZDogcGFzc3dvcmQsIG11c3RDaGFuZ2U6IHRydWUgfSlcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0RlbGV0ZScpIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3VzZXJzJyB9O1xyXG4gICAgZm9yIChjb25zdCB1c2VyIG9mIFNFRURfVVNFUlMpIHtcclxuICAgICAgICBjb25zdCB0ZW1wUGFzc3dvcmQgPSBnZW5lcmF0ZVRlbXBQYXNzd29yZCgpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFBlcm1hbmVudD1mYWxzZSAoZGVmYXVsdCkg4oaSIENvZ25pdG8gZmxhZ3MgRk9SQ0VfQ0hBTkdFX1BBU1NXT1JELlxyXG4gICAgICAgICAgICBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluQ3JlYXRlVXNlckNvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgVXNlclBvb2xJZDogUE9PTCxcclxuICAgICAgICAgICAgICAgIFVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgTWVzc2FnZUFjdGlvbjogJ1NVUFBSRVNTJyxcclxuICAgICAgICAgICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgICAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgICAgICAgICAgVmFsdWU6IHVzZXIuZW1haWwgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICduYW1lJywgICAgICAgICAgIFZhbHVlOiB1c2VyLm5hbWUgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6ICdnZW5kZXInLCAgICAgICAgIFZhbHVlOiAnTWFsZScgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGF3YWl0IGNvZ25pdG8uc2VuZChuZXcgQWRtaW5BZGRVc2VyVG9Hcm91cENvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgVXNlclBvb2xJZDogUE9PTCwgVXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsIEdyb3VwTmFtZTogdXNlci5ncm91cFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHN0b3JlU2VjcmV0KHVzZXIudXNlcm5hbWUsIHRlbXBQYXNzd29yZCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBpZiAoZS5uYW1lID09PSAnVXNlcm5hbWVFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBVc2VyIGFscmVhZHkgZXhpc3RzIOKAlCBkbyBub3QgcmVzZXQgdGhlaXIgcGFzc3dvcmQgc2lsZW50bHkuXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3VzZXJzJyB9O1xyXG59O1xyXG4gICAgICAgICAgICBgKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB1c2Vyc0ZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkFkZFVzZXJUb0dyb3VwJ1xyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHVzZXJzRm4uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkNyZWF0ZVNlY3JldCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOlB1dFNlY3JldFZhbHVlJyxcclxuICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6RGVzY3JpYmVTZWNyZXQnXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtyZWdpb259OiR7YWNjb3VudElkfTpzZWNyZXQ6L3RpcnlhcS9zZWVkLXVzZXJzLypgXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIExhbWJkYSBtdXN0IGJlIGFsbG93ZWQgdG8gdXNlIHRoZSBkYXRhIENNSyB0byBlbmNyeXB0IHRoZSBzZWNyZXQuXHJcbiAgICAgICAgdGlyeWFxRGF0YUtleS5ncmFudEVuY3J5cHREZWNyeXB0KHVzZXJzRm4pO1xyXG5cclxuICAgICAgICBjb25zdCB1c2Vyc1Byb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdVc2Vyc1Byb3ZpZGVyJywgeyBvbkV2ZW50SGFuZGxlcjogdXNlcnNGbiB9KTtcclxuICAgICAgICBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsICdDcmVhdGVVc2VycycsIHtcclxuICAgICAgICAgICAgc2VydmljZVRva2VuOiB1c2Vyc1Byb3ZpZGVyLnNlcnZpY2VUb2tlbixcclxuICAgICAgICAgICAgcHJvcGVydGllczogeyB1c2VyUG9vbElkOiB1c2VyUG9vbC51c2VyUG9vbElkIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgKyBKV1QgQXV0aG9yaXplclxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgSHR0cEp3dEF1dGhvcml6ZXIoJ1RpcnlhcUF1dGhvcml6ZXInLCBgaHR0cHM6Ly9jb2duaXRvLWlkcC4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8ke3VzZXJQb29sLnVzZXJQb29sSWR9YCwge1xyXG4gICAgICAgICAgICBqd3RBdWRpZW5jZTogW2FwcENsaWVudC51c2VyUG9vbENsaWVudElkXSxcclxuICAgICAgICAgICAgaWRlbnRpdHlTb3VyY2U6IFsnJHJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkgKGludGVncml0eSAmIGNvbmZpZGVudGlhbGl0eSkuXHJcbiAgICAgICAgLy8gQ09SUyBpcyByZXN0cmljdGVkIHRvIHRoZSBwcm9kdWN0aW9uIENsb3VkRnJvbnQgZG9tYWluIHBsdXMgbG9jYWxob3N0XHJcbiAgICAgICAgLy8gZm9yIGRldi4gV2lsZGNhcmQgb3JpZ2lucyBhcmUgZm9yYmlkZGVuIOKAlCB0aGV5IGVuYWJsZSBjcm9zcy1zaXRlIGRhdGFcclxuICAgICAgICAvLyBleGZpbHRyYXRpb24gZnJvbSB0aGUgcGF0aWVudCdzIGJyb3dzZXIuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgYWxsb3dlZE9yaWdpbnMgPSBbXHJcbiAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjQyMDAnLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly9kNmk3aXdrbmtqMGJnLmNsb3VkZnJvbnQubmV0JyxcclxuICAgICAgICAgICAgJ2h0dHBzOi8vYWt3YWRvbmEuY29tJyxcclxuICAgICAgICAgICAgJ2h0dHBzOi8vd3d3LmFrd2Fkb25hLmNvbSdcclxuICAgICAgICBdO1xyXG4gICAgICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnd3YyLkh0dHBBcGkodGhpcywgJ1RpcnlhcUh0dHBBcGknLCB7XHJcbiAgICAgICAgICAgIGFwaU5hbWU6ICd0aXJ5YXEtYXBpJyxcclxuICAgICAgICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgICAgICAgICAgYWxsb3dPcmlnaW5zOiBhbGxvd2VkT3JpZ2lucyxcclxuICAgICAgICAgICAgICAgIGFsbG93TWV0aG9kczogW1xyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuR0VULFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuUE9TVCxcclxuICAgICAgICAgICAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBBVENILFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuREVMRVRFLFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OU1xyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUNsaWVudC1SZXF1ZXN0LUlkJ10sXHJcbiAgICAgICAgICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgcm91dGUgPSAocGF0aDogc3RyaW5nLCBtZXRob2RzOiBhcGlnd3YyLkh0dHBNZXRob2RbXSwgaGFuZGxlcjogbGFtYmRhLkZ1bmN0aW9uKSA9PlxyXG4gICAgICAgICAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzLFxyXG4gICAgICAgICAgICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24ocGF0aC5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJycpICsgbWV0aG9kcy5qb2luKCcnKSwgaGFuZGxlciksXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVyXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxQYXRpZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRQYXRpZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHVwZGF0ZVBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3Jlc3RvcmUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3NlYXJjaCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsRG9jdG9yc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVEb2N0b3JGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL3tkb2N0b3JJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldERvY3RvckJ5SURGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL3tkb2N0b3JJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlRG9jdG9yRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycy97ZG9jdG9ySUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVEb2N0b3JGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL2VtYWlsL3tlbWFpbH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldERvY3RvckJ5RW1haWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVQYXRpZW50UGF5bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzL3twYXltZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRQYXltZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzL3twYXltZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHVwZGF0ZVBhdGllbnRQYXltZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMve3BheW1lbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZVBheW1lbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXltZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SURGbik7XHJcbiAgICAgICAgcm91dGUoJy9pbnZvaWNlcycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsSW52b2ljZXNGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9zdXJnZXJpZXMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGxpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3N1cmdlcmllcycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZVBhdGllbnRTdXJnZXJ5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3VyZ2VyaWVzL3tzdXJnZXJ5SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRTdXJnZXJ5QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlTmV3RGVwYXJ0bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzL2J1bGsnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBidWxrQ3JlYXRlRGVwYXJ0bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9kZXBhcnRtZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlQWxsRGVwYXJ0bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbFNwZWNpYWxpemF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3NwZWNpYWxpemF0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZU5ld1NwZWNpYWxpemF0aW9uRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zL2J1bGsnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVBbGxTcGVjaWFsaXphdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9hZG1pbi9zdGF0cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3VzZXJzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9kaXNhYmxlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3VzZXJzL3t1c2VybmFtZX0vZW5hYmxlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3VzZXJzL3t1c2VybmFtZX0vc2V0LXBhc3N3b3JkJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL2F1ZGl0JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zL3tleGFtSWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGV4YW1pbmF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2V4YW1pbmF0aW9ucy97ZXhhbUlkfS9zaWdub2ZmJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIC8vIFBoYXJtYWN5IHJvdXRlcyDigJQgcGF0aHMgbWF0Y2ggdGhlIHRpcnlhcS1waGFybWFjeSBMYW1iZGEncyBpbnRlcm5hbCByb3V0ZXIuXHJcbiAgICAgICAgLy8gKExhbWJkYSBkaXNwYXRjaGVzIG9uIGV2ZW50LnJhd1BhdGg7IENESyBtdXN0IHJlZ2lzdGVyIGlkZW50aWNhbCBwYXRocy4pXHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9tZWRpY2F0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvbWVkaWNhdGlvbnMve21lZElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2ludmVudG9yeScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvaW52ZW50b3J5L3ttZWRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9wcmVzY3JpcHRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9wcmVzY3JpcHRpb25zL3tyeElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2Rpc3BlbnNlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9wdXJjaGFzZS1vcmRlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3B1cmNoYXNlLW9yZGVycy97cG9JZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9hbGVydHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIC8vIERvY3VtZW50IG1hbmFnZXIg4oCUIHBhdGhzIG1hdGNoIHRoZSB0aXJ5YXEtZG9jdW1lbnQtbWFuYWdlciBMYW1iZGEnc1xyXG4gICAgICAgIC8vIGludGVybmFsIHJvdXRlciBhbmQgdGhlIEFuZ3VsYXIgRG9jdW1lbnRTZXJ2aWNlIGNhbGxzLlxyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL3VwbG9hZC11cmwnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvZG93bmxvYWQtdXJsJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL2xpc3QnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3VtZW50cy9mb2xkZXJzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N1bWVudHMvZGVsZXRlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9hdWRpdCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGF1ZGl0Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYXBwb2ludG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYXBwb2ludG1lbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYXBwb2ludG1lbnRzL3thcHB0SWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGFwcG9pbnRtZW50c0ZuKTtcclxuXHJcbiAgICAgICAgLy8gSG9zcGl0YWwgY2FsZW5kYXIgcm91dGVzIOKAlCBUaXJ5YXEtbG9jYWwsIEpXVC1hdXRoZW50aWNhdGVkLlxyXG4gICAgICAgIHJvdXRlKCcvY2FsZW5kYXJzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY2FsZW5kYXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMve2NhbGVuZGFySWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0vZXZlbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY2FsZW5kYXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMve2NhbGVuZGFySWR9L2V2ZW50cy97ZXZlbnRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgY2FsZW5kYXJGbik7XHJcblxyXG4gICAgICAgIC8vIEJsb29kIEJhbmsgbW9kdWxlXHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvZG9ub3JzJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvZG9ub3JzL3tkb25vcklkfScsICAgICAgICAgICAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25vcnMve2Rvbm9ySWR9L2RvbmF0aW9ucycsICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay9kb25hdGlvbnMnLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay91bml0cycsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb29kYmFua0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2Jsb29kYmFuay91bml0cy97dW5pdElkfScsICAgICAgICAgICAgICAgICAgICAgICAgICBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3N0b2NrJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3JlcXVlc3RzJywgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sICAgYmxvb2RiYW5rRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYmxvb2RiYW5rL3JlcXVlc3RzL3tyZXF1ZXN0SWR9JywgICAgICAgICAgICAgICAgICAgIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMve3JlcXVlc3RJZH0vY3Jvc3NtYXRjaCcsICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9vZGJhbmtGbik7XHJcbiAgICAgICAgcm91dGUoJy9ibG9vZGJhbmsvcmVxdWVzdHMve3JlcXVlc3RJZH0vaXNzdWUnLCAgICAgICAgICAgICAgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9vZGJhbmtGbik7XHJcblxyXG4gICAgICAgIC8vIFNjcmliZUZpcnN0IFBoYXNlIDEg4oCUIFNPQVAgc2NyaWJlIHJvdXRlc1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgc2NyaWJlRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zL3tpZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIHNjcmliZUZuKTtcclxuICAgICAgICByb3V0ZSgnL3NjcmliZS9zZXNzaW9ucy97aWR9L3NvYXAnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMve2lkfS9hcHByb3ZlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgc2NyaWJlRm4pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTMyArIENsb3VkRnJvbnRcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxRnJvbnRlbmRCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IGZhbHNlLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNUyxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxRGF0YUtleSxcclxuICAgICAgICAgICAgYnVja2V0S2V5RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICAgICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiBhY2Nlc3NMb2dzQnVja2V0LFxyXG4gICAgICAgICAgICBzZXJ2ZXJBY2Nlc3NMb2dzUHJlZml4OiAnczMtYWNjZXNzL2Zyb250ZW5kLycsXHJcbiAgICAgICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICdleHBpcmUtbm9uY3VycmVudC12ZXJzaW9ucycsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDE4MClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBvYWMgPSBuZXcgY2xvdWRmcm9udC5TM09yaWdpbkFjY2Vzc0NvbnRyb2wodGhpcywgJ1RpcnlhcU9BQycsIHtcclxuICAgICAgICAgICAgc2lnbmluZzogY2xvdWRmcm9udC5TaWduaW5nLlNJR1Y0X05PX09WRVJSSURFXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnVGlyeWFxRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcclxuICAgICAgICAgICAgICAgIG9yaWdpbjogY2xvdWRmcm9udE9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2woc2l0ZUJ1Y2tldCwge1xyXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0NvbnRyb2w6IG9hY1xyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICAgICAgICBjYWNoZVBvbGljeTogQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQUQsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IGNsb3VkZnJvbnQuUmVzcG9uc2VIZWFkZXJzUG9saWN5LlNFQ1VSSVRZX0hFQURFUlNcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgICAgICAgICAgbWluaW11bVByb3RvY29sVmVyc2lvbjogY2xvdWRmcm9udC5TZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8yXzIwMjEsXHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2UgcmVncmVzc2lvbjogV0FGIHRlbXBvcmFyaWx5IGRpc2FibGVkIHRvIHN0b3AgY2hhcmdlcy5cclxuICAgICAgICAgICAgLy8gUmUtZW5hYmxlIGJ5IHNldHRpbmcgd2ViQWNsSWQgYmFjayB0byBwcm9wcz8ud2ViQWNsQXJuIGFuZFxyXG4gICAgICAgICAgICAvLyByZS1pbnN0YXRpbmcgdGhlIFRpcnlhcUVkZ2VTdGFjayBpbiBiaW4vdGlyeWFxLWNkay50cy5cclxuICAgICAgICAgICAgLy8gd2ViQWNsSWQ6IHByb3BzPy53ZWJBY2xBcm4sXHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIGF1ZGl0IHRyYWlsIOKAlCBsb2cgZXZlcnkgQ2xvdWRGcm9udCByZXF1ZXN0XHJcbiAgICAgICAgICAgIC8vICh2aWV3ZXIgSVAsIHJlcXVlc3QgVVJJLCByZXNwb25zZSBzdGF0dXMpLiBTZW50IHRvIHRoZVxyXG4gICAgICAgICAgICAvLyBzZXJ2aWNlLWxvZ3MgYnVja2V0IGJlY2F1c2UgQ2xvdWRGcm9udCBjYW5ub3QgZGVsaXZlciB0byBhblxyXG4gICAgICAgICAgICAvLyBTU0UtS01TIGRlc3RpbmF0aW9uLlxyXG4gICAgICAgICAgICBlbmFibGVMb2dnaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBsb2dCdWNrZXQ6IGFjY2Vzc0xvZ3NCdWNrZXQsXHJcbiAgICAgICAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdjbG91ZGZyb250LycsXHJcbiAgICAgICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXHJcbiAgICAgICAgICAgICAgICB7IGh0dHBTdGF0dXM6IDQwMywgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcgfSxcclxuICAgICAgICAgICAgICAgIHsgaHR0cFN0YXR1czogNDA0LCByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCwgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyB9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGNvbW1lbnQ6ICdUaXJ5YXEgSG9zcGl0YWwgUGxhdGZvcm0nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNpdGVCdWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW2Ake3NpdGVCdWNrZXQuYnVja2V0QXJufS8qYF0sXHJcbiAgICAgICAgICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjbG91ZGZyb250LmFtYXpvbmF3cy5jb20nKV0sXHJcbiAgICAgICAgICAgICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdBV1M6U291cmNlQXJuJzogYGFybjphd3M6Y2xvdWRmcm9udDo6JHthY2NvdW50SWR9OmRpc3RyaWJ1dGlvbi8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZH1gXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIERvY3VtZW50cyBidWNrZXQgKG93bmVkIGJ5IFRISVMgYWNjb3VudClcclxuICAgICAgICAvLyBUaGUgb2xkIGB0aXJ5YXEtZG9jdW1lbnRzYCBuYW1lIGJlbG9uZ3MgdG8gYSBkaWZmZXJlbnQgYWNjb3VudCwgd2hpY2hcclxuICAgICAgICAvLyBpcyB3aHkgQ09SUyBjb3VsZCBuZXZlciBiZSBzZXQuIFdlIGNyZWF0ZSBvdXIgb3duIGFjY291bnQtc2NvcGVkXHJcbiAgICAgICAgLy8gYnVja2V0IGFuZCBkZWNsYXJlIENPUlMgYXMgYSBwcm9wZXJ0eSBzbyBicm93c2Vy4oaSUzMgcHJlLXNpZ25lZCBQVVQvR0VUXHJcbiAgICAgICAgLy8gdXBsb2FkcyBhcmUgYWxsb3dlZC4gVGhlIExhbWJkYSByZWFkcyB0aGUgbmFtZSBmcm9tIERPQ1VNRU5UU19CVUNLRVQuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgZG9jdW1lbnRzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxRG9jdW1lbnRzQnVja2V0Jywge1xyXG4gICAgICAgICAgICBidWNrZXROYW1lOiBgdGlyeWFxLWRvY3VtZW50cy0ke2FjY291bnRJZH0tJHtyZWdpb259YCxcclxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgY29yczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICAgICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCwgczMuSHR0cE1ldGhvZHMuUFVULCBzMy5IdHRwTWV0aG9kcy5QT1NULCBzMy5IdHRwTWV0aG9kcy5IRUFEXSxcclxuICAgICAgICAgICAgICAgICAgICBhbGxvd2VkT3JpZ2lucyxcclxuICAgICAgICAgICAgICAgICAgICBleHBvc2VkSGVhZGVyczogWydFVGFnJywgJ0NvbnRlbnQtTGVuZ3RoJywgJ0NvbnRlbnQtVHlwZSddLFxyXG4gICAgICAgICAgICAgICAgICAgIG1heEFnZTogMzYwMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnRzQnVja2V0LmdyYW50UmVhZFdyaXRlKGRvY3VtZW50TWFuYWdlckZuKTtcclxuICAgICAgICBkb2N1bWVudE1hbmFnZXJGbi5hZGRFbnZpcm9ubWVudCgnRE9DVU1FTlRTX0JVQ0tFVCcsIGRvY3VtZW50c0J1Y2tldC5idWNrZXROYW1lKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gT3V0cHV0c1xyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7IHZhbHVlOiBhcGkuYXBpRW5kcG9pbnQsIGRlc2NyaXB0aW9uOiAnSFRUUCBBUEkgVVJMIOKGkiB1cGRhdGUgQ29uZmlnLnRzIHRpcnlhcVVybCcgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnRVcmwnLCB7IHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsIGRlc2NyaXB0aW9uOiAnRnJvbnRlbmQgVVJMIOKGkiB1cGRhdGUgY2FsbGJhY2tVcmxzICsgbG9nb3V0VXJscyB0aGVuIHJlZGVwbG95JyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUzNCdWNrZXROYW1lJywgeyB2YWx1ZTogc2l0ZUJ1Y2tldC5idWNrZXROYW1lLCBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCDihpIgbmcgYnVpbGQgKyBhd3MgczMgc3luYycgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7IHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkLCBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEIOKGkiB1cGRhdGUgYXBwLmNvbmZpZy50cyBhdXRob3JpdHknIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBDbGllbnRJZCcsIHsgdmFsdWU6IGFwcENsaWVudC51c2VyUG9vbENsaWVudElkLCBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gQXBwIENsaWVudCBJRCDihpIgdXBkYXRlIGFwcC5jb25maWcudHMgY2xpZW50SWQnIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHsgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCwgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCDihpIgY2FjaGUgaW52YWxpZGF0aW9uJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b0F1dGhvcml0eScsIHsgdmFsdWU6IGBodHRwczovL2NvZ25pdG8taWRwLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tLyR7dXNlclBvb2wudXNlclBvb2xJZH1gLCBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gYXV0aG9yaXR5IFVSTCDihpIgdXBkYXRlIGFwcC5jb25maWcudHMnIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEb2N1bWVudHNCdWNrZXROYW1lJywgeyB2YWx1ZTogZG9jdW1lbnRzQnVja2V0LmJ1Y2tldE5hbWUsIGRlc2NyaXB0aW9uOiAnRG9jdW1lbnRzIGJ1Y2tldCAodXBsb2FkcyB2aWEgcHJlLXNpZ25lZCBVUkxzKScgfSk7XHJcbiAgICB9XHJcbn1cclxuIl19