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
        const fn = (id, folder, handler, runtime = lambda.Runtime.NODEJS_18_X, extraEnv = {}) => new lambda.Function(this, id, {
            functionName: folder,
            runtime,
            handler,
            code: lambda.Code.fromAsset(`lambda/${folder}`),
            environment: { ...sharedEnv, ...extraEnv },
            timeout: cdk.Duration.seconds(30)
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
        // ─────────────────────────────────────────────────────────────────────
        // ScribeFirst Phase 1 — SOAP generation Lambda.
        // Calls Bedrock for transcript → SOAP split; writes session + audit
        // rows to the existing single-table.
        // BEDROCK_REGION can differ from AWS_REGION when Bedrock isn't yet
        // available in the data-plane region (e.g. me-south-1 production).
        // ─────────────────────────────────────────────────────────────────────
        const scribeFn = fn('TiryaqScribe', 'tiryaq-scribe', 'index.handler', lambda.Runtime.NODEJS_20_X, {
            BEDROCK_REGION: 'us-east-1',
            BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0'
        });
        // Allow Bedrock InvokeModel only on the Haiku model, in us-east-1.
        scribeFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: [
                'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'
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
            scribeFn
        ];
        allFunctions.forEach((f) => {
            table.grantReadWriteData(f);
            // Compliance: Lambda execution roles must be explicitly granted
            // KMS Encrypt/Decrypt on the data CMK because DynamoDB CUSTOMER_MANAGED
            // encryption requires the caller principal to have key access.
            tiryaqDataKey.grantEncryptDecrypt(f);
        });
        // Seed Lambda also writes to the encrypted table.
        // (granted further down where seedFn is defined.)
        adminPanelFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['cognito-idp:ListUsers', 'cognito-idp:ListUsersInGroup', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminEnableUser', 'cognito-idp:AdminSetUserPassword'],
            resources: [userPool.userPoolArn]
        }));
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
                allowHeaders: ['Content-Type', 'Authorization'],
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
        route('/documents', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], documentManagerFn);
        route('/documents/{documentId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.DELETE], documentManagerFn);
        route('/documents/{documentId}/presign', [apigwv2.HttpMethod.GET], documentManagerFn);
        route('/audit', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], auditFn);
        route('/appointments', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], appointmentsFn);
        route('/appointments/{apptId}', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], appointmentsFn);
        // Hospital calendar routes — Tiryaq-local, JWT-authenticated.
        route('/calendars', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], calendarFn);
        route('/calendars/{calendarId}', [apigwv2.HttpMethod.DELETE], calendarFn);
        route('/calendars/{calendarId}/events', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], calendarFn);
        route('/calendars/{calendarId}/events/{eventId}', [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE], calendarFn);
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
        // Outputs
        // ─────────────────────────────────────────────────────────────────────
        new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint, description: 'HTTP API URL → update Config.ts tiryaqUrl' });
        new cdk.CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.distributionDomainName}`, description: 'Frontend URL → update callbackUrls + logoutUrls then redeploy' });
        new cdk.CfnOutput(this, 'S3BucketName', { value: siteBucket.bucketName, description: 'S3 bucket → ng build + aws s3 sync' });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId, description: 'Cognito User Pool ID → update app.config.ts authority' });
        new cdk.CfnOutput(this, 'AppClientId', { value: appClient.userPoolClientId, description: 'Cognito App Client ID → update app.config.ts clientId' });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId, description: 'CloudFront Distribution ID → cache invalidation' });
        new cdk.CfnOutput(this, 'CognitoAuthority', { value: `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`, description: 'Cognito authority URL → update app.config.ts' });
    }
}
exports.TiryaqStack = TiryaqStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlyeWFxLWNkay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpcnlhcS1jZGstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELHNFQUF3RDtBQUN4RCx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFNbkQsK0RBQStGO0FBQy9GLDZGQUFrRjtBQUNsRiwyRkFBNkU7QUFHN0UsTUFBTSxXQUFXLEdBQUc7SUFDaEIsb0JBQW9CO0lBQ3BCLG1CQUFtQjtJQUNuQixpQkFBaUI7SUFDakIsWUFBWTtJQUNaLHlCQUF5QjtJQUN6QixZQUFZO0lBQ1osV0FBVztJQUNYLGFBQWE7SUFDYixXQUFXO0lBQ1gsV0FBVztJQUNYLGdCQUFnQjtJQUNoQixZQUFZO0lBQ1osYUFBYTtJQUNiLGVBQWU7SUFDZix5QkFBeUI7SUFDekIsU0FBUztJQUNULFVBQVU7SUFDVixZQUFZO0lBQ1osYUFBYTtJQUNiLGtCQUFrQjtJQUNsQixlQUFlO0lBQ2YsY0FBYztJQUNkLG9CQUFvQjtJQUNwQixZQUFZO0lBQ1osb0NBQW9DO0lBQ3BDLFVBQVU7SUFDVixTQUFTO0lBQ1QsZ0JBQWdCO0NBQ25CLENBQUM7QUFFRixNQUFNLGVBQWUsR0FBRztJQUNwQixtQ0FBbUM7SUFDbkMsWUFBWTtJQUNaLGtCQUFrQjtJQUNsQiwwQkFBMEI7SUFDMUIsWUFBWTtJQUNaLG9DQUFvQztJQUNwQyxjQUFjO0lBQ2QsWUFBWTtJQUNaLG9CQUFvQjtJQUNwQixvQkFBb0I7SUFDcEIsaUJBQWlCO0lBQ2pCLHdCQUF3QjtJQUN4QixjQUFjO0lBQ2Qsb0JBQW9CO0lBQ3BCLGtDQUFrQztJQUNsQyxrQkFBa0I7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JztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ3d2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnRPcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcclxuaW1wb3J0ICogYXMgY2xvdWR0cmFpbCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR0cmFpbCc7XHJcbmltcG9ydCAqIGFzIGNyIGZyb20gJ2F3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaXJ5YXFTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gICAgLyoqIEFSTiBvZiB0aGUgQ2xvdWRGcm9udC1zY29wZWQgV0FGdjIgV2ViQUNMIGNyZWF0ZWQgaW4gdGhlIGVkZ2UgKHVzLWVhc3QtMSkgc3RhY2suICovXHJcbiAgICB3ZWJBY2xBcm4/OiBzdHJpbmc7XHJcbn1cclxuaW1wb3J0IHsgVmlld2VyUHJvdG9jb2xQb2xpY3ksIEFsbG93ZWRNZXRob2RzLCBDYWNoZVBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcclxuaW1wb3J0IHsgSHR0cExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgeyBIdHRwSnd0QXV0aG9yaXplciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmNvbnN0IERFUEFSVE1FTlRTID0gW1xyXG4gICAgJ0VtZXJnZW5jeSBNZWRpY2luZScsXHJcbiAgICAnSW50ZXJuYWwgTWVkaWNpbmUnLFxyXG4gICAgJ0dlbmVyYWwgU3VyZ2VyeScsXHJcbiAgICAnUGVkaWF0cmljcycsXHJcbiAgICAnT2JzdGV0cmljcyAmIEd5bmVjb2xvZ3knLFxyXG4gICAgJ0NhcmRpb2xvZ3knLFxyXG4gICAgJ05ldXJvbG9neScsXHJcbiAgICAnT3J0aG9wZWRpY3MnLFxyXG4gICAgJ1JhZGlvbG9neScsXHJcbiAgICAnUGF0aG9sb2d5JyxcclxuICAgICdBbmVzdGhlc2lvbG9neScsXHJcbiAgICAnUHN5Y2hpYXRyeScsXHJcbiAgICAnRGVybWF0b2xvZ3knLFxyXG4gICAgJ09waHRoYWxtb2xvZ3knLFxyXG4gICAgJ0VhciBOb3NlICYgVGhyb2F0IChFTlQpJyxcclxuICAgICdVcm9sb2d5JyxcclxuICAgICdPbmNvbG9neScsXHJcbiAgICAnTmVwaHJvbG9neScsXHJcbiAgICAnUHVsbW9ub2xvZ3knLFxyXG4gICAgJ0dhc3Ryb2VudGVyb2xvZ3knLFxyXG4gICAgJ0VuZG9jcmlub2xvZ3knLFxyXG4gICAgJ1JoZXVtYXRvbG9neScsXHJcbiAgICAnSW5mZWN0aW91cyBEaXNlYXNlJyxcclxuICAgICdIZW1hdG9sb2d5JyxcclxuICAgICdQaHlzaWNhbCBNZWRpY2luZSAmIFJlaGFiaWxpdGF0aW9uJyxcclxuICAgICdQaGFybWFjeScsXHJcbiAgICAnTnVyc2luZycsXHJcbiAgICAnQWRtaW5pc3RyYXRpb24nXHJcbl07XHJcblxyXG5jb25zdCBTUEVDSUFMSVpBVElPTlMgPSBbXHJcbiAgICAnR2VuZXJhbCAoQWR1bHQpIEludGVybmFsIE1lZGljaW5lJyxcclxuICAgICdDYXJkaW9sb2d5JyxcclxuICAgICdHYXN0cm9lbnRlcm9sb2d5JyxcclxuICAgICdFbmRvY3Jpbm9sb2d5ICYgRGlhYmV0ZXMnLFxyXG4gICAgJ05lcGhyb2xvZ3knLFxyXG4gICAgJ1B1bG1vbm9sb2d5ICYgUmVzcGlyYXRvcnkgTWVkaWNpbmUnLFxyXG4gICAgJ1JoZXVtYXRvbG9neScsXHJcbiAgICAnSGVtYXRvbG9neScsXHJcbiAgICAnSW5mZWN0aW91cyBEaXNlYXNlJyxcclxuICAgICdHZXJpYXRyaWMgTWVkaWNpbmUnLFxyXG4gICAgJ0dlbmVyYWwgU3VyZ2VyeScsXHJcbiAgICAnQ2FyZGlvdGhvcmFjaWMgU3VyZ2VyeScsXHJcbiAgICAnTmV1cm9zdXJnZXJ5JyxcclxuICAgICdPcnRob3BlZGljIFN1cmdlcnknLFxyXG4gICAgJ1BsYXN0aWMgJiBSZWNvbnN0cnVjdGl2ZSBTdXJnZXJ5JyxcclxuICAgICdWYXNjdWxhciBTdXJnZXJ5JyxcclxuICAgICdQZWRpYXRyaWMgU3VyZ2VyeScsXHJcbiAgICAnVXJvbG9naWNhbCBTdXJnZXJ5JyxcclxuICAgICdFbWVyZ2VuY3kgTWVkaWNpbmUnLFxyXG4gICAgJ0NyaXRpY2FsIENhcmUgTWVkaWNpbmUnLFxyXG4gICAgJ1RyYXVtYSBTdXJnZXJ5JyxcclxuICAgICdHZW5lcmFsIFBlZGlhdHJpY3MnLFxyXG4gICAgJ05lb25hdG9sb2d5JyxcclxuICAgICdQZWRpYXRyaWMgQ2FyZGlvbG9neScsXHJcbiAgICAnUGVkaWF0cmljIE5ldXJvbG9neScsXHJcbiAgICAnUGVkaWF0cmljIE9uY29sb2d5JyxcclxuICAgICdPYnN0ZXRyaWNzICYgR3luZWNvbG9neScsXHJcbiAgICAnTWF0ZXJuYWwtRmV0YWwgTWVkaWNpbmUnLFxyXG4gICAgJ0d5bmVjb2xvZ2ljIE9uY29sb2d5JyxcclxuICAgICdOZXVyb2xvZ3knLFxyXG4gICAgJ1BzeWNoaWF0cnknLFxyXG4gICAgJ0NsaW5pY2FsIE5ldXJvcGh5c2lvbG9neScsXHJcbiAgICAnUmFkaW9sb2d5ICYgTWVkaWNhbCBJbWFnaW5nJyxcclxuICAgICdOdWNsZWFyIE1lZGljaW5lJyxcclxuICAgICdQYXRob2xvZ3kgJiBMYWJvcmF0b3J5IE1lZGljaW5lJyxcclxuICAgICdPcGh0aGFsbW9sb2d5JyxcclxuICAgICdPdG9sYXJ5bmdvbG9neSAoRU5UKScsXHJcbiAgICAnRGVybWF0b2xvZ3knLFxyXG4gICAgJ1Nwb3J0cyBNZWRpY2luZScsXHJcbiAgICAnTWVkaWNhbCBPbmNvbG9neScsXHJcbiAgICAnUmFkaWF0aW9uIE9uY29sb2d5JyxcclxuICAgICdBbmVzdGhlc2lvbG9neScsXHJcbiAgICAnUGFpbiBNZWRpY2luZScsXHJcbiAgICAnUGFsbGlhdGl2ZSBDYXJlJyxcclxuICAgICdGYW1pbHkgTWVkaWNpbmUnLFxyXG4gICAgJ09jY3VwYXRpb25hbCBNZWRpY2luZScsXHJcbiAgICAnUHVibGljIEhlYWx0aCdcclxuXTtcclxuXHJcbmV4cG9ydCBjbGFzcyBUaXJ5YXFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFRpcnlhcVN0YWNrUHJvcHMpIHtcclxuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAgICAgY29uc3QgYWNjb3VudElkID0gY2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnQ7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gY2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbjtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5IOKAlCBlbmNyeXB0aW9uIGF0IHJlc3Qgd2l0aCBjdXN0b21lciBjb250cm9sLlxyXG4gICAgICAgIC8vIFR3byBDTUtzOlxyXG4gICAgICAgIC8vICAgLSB0aXJ5YXFEYXRhS2V5ICDihpIgZW5jcnlwdHMgRHluYW1vREIgYW5kIHRoZSBmcm9udGVuZCBTMyBidWNrZXRcclxuICAgICAgICAvLyAgIC0gdGlyeWFxQXVkaXRLZXkg4oaSIGVuY3J5cHRzIHRoZSBhdWRpdCBsb2cgYnVja2V0IChzZXBhcmF0ZWQgc29cclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wbGFuZSBrZXkgY29tcHJvbWlzZSBkb2VzIG5vdCBpbnZhbGlkYXRlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgIHRoZSBhdWRpdCBjaGFpbilcclxuICAgICAgICAvLyBBbm51YWwgYXV0b21hdGljIHJvdGF0aW9uOyBrZXkgYWRtaW5zIGxpbWl0ZWQgdG8gdGhlIGRlcGxveWluZ1xyXG4gICAgICAgIC8vIHByaW5jaXBhbDsgdXNhZ2UgbGltaXRlZCB0byBzcGVjaWZpYyBBV1Mgc2VydmljZXMgaW4gdGhpcyBhY2NvdW50LlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHRpcnlhcURhdGFLZXkgPSBuZXcga21zLktleSh0aGlzLCAnVGlyeWFxRGF0YUtleScsIHtcclxuICAgICAgICAgICAgYWxpYXM6ICdhbGlhcy90aXJ5YXEvZGF0YScsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ01LIGZvciBUaXJ5YXEgRHluYW1vREIgYW5kIGZyb250ZW5kIGJ1Y2tldCDigJQgUERQUEwgQXJ0LiA5LicsXHJcbiAgICAgICAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIHBlbmRpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5kYXlzKDMwKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCB0aXJ5YXFBdWRpdEtleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdUaXJ5YXFBdWRpdEtleScsIHtcclxuICAgICAgICAgICAgYWxpYXM6ICdhbGlhcy90aXJ5YXEvYXVkaXQnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NNSyBmb3IgVGlyeWFxIGF1ZGl0IGxvZyBidWNrZXQgYW5kIENsb3VkVHJhaWwg4oCUIHNlZ3JlZ2F0ZWQgZnJvbSBkYXRhIGtleS4nLFxyXG4gICAgICAgICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBwZW5kaW5nV2luZG93OiBjZGsuRHVyYXRpb24uZGF5cygzMClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ2xvdWRUcmFpbCAodGhlIEFXUyBzZXJ2aWNlKSBuZWVkcyBwZXJtaXNzaW9uIHRvIHVzZSB0aGUgYXVkaXQgQ01LXHJcbiAgICAgICAgLy8gd2hlbiBpdCB3cml0ZXMgZW5jcnlwdGVkIGxvZyBmaWxlcyBpbnRvIHRoZSBhdWRpdCBidWNrZXQuXHJcbiAgICAgICAgdGlyeWFxQXVkaXRLZXkuYWRkVG9SZXNvdXJjZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgc2lkOiAnQWxsb3dDbG91ZFRyYWlsRW5jcnlwdExvZ3MnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydrbXM6R2VuZXJhdGVEYXRhS2V5KicsICdrbXM6RGVzY3JpYmVLZXknXSxcclxuICAgICAgICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkdHJhaWwuYW1hem9uYXdzLmNvbScpXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgICAgICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgU3RyaW5nRXF1YWxzOiB7ICdhd3M6U291cmNlQWNjb3VudCc6IGNkay5Bd3MuQUNDT1VOVF9JRCB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogc2VwYXJhdGUgXCJzZXJ2aWNlIGFjY2VzcyBsb2dzXCIgYnVja2V0LlxyXG4gICAgICAgIC8vIFMzIHNlcnZlciBhY2Nlc3MgbG9nZ2luZyBhbmQgQ2xvdWRGcm9udCBzdGFuZGFyZCBsb2dnaW5nIGJvdGhcclxuICAgICAgICAvLyByZWZ1c2UgU1NFLUtNUyBkZXN0aW5hdGlvbiBidWNrZXRzLCBzbyB3ZSBrZWVwIHRoZXNlIEFXUy1zZXJ2aWNlXHJcbiAgICAgICAgLy8gbG9ncyBpbiBhIGRlZGljYXRlZCBidWNrZXQgd2l0aCBTU0UtUzMgKyB2ZXJzaW9uaW5nICsgbGlmZWN5Y2xlLlxyXG4gICAgICAgIC8vIFRoZSBoaWdoLWFzc3VyYW5jZSAoQ01LICsgT2JqZWN0IExvY2spIGJ1Y2tldCBiZWxvdyBob2xkc1xyXG4gICAgICAgIC8vIENsb3VkVHJhaWwgYW5kIGV4cG9ydGVkIGFwcGxpY2F0aW9uIGF1ZGl0IG9ubHkuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgYWNjZXNzTG9nc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1RpcnlhcUFjY2Vzc0xvZ3NCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGB0aXJ5YXEtYWNjZXNzLWxvZ3MtJHthY2NvdW50SWR9LSR7cmVnaW9ufWAsXHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICAgICAgICBvYmplY3RPd25lcnNoaXA6IHMzLk9iamVjdE93bmVyc2hpcC5CVUNLRVRfT1dORVJfUFJFRkVSUkVELFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd0cmFuc2l0aW9uLWFuZC1leHBpcmUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUywgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMCkgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLCB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSB9XHJcbiAgICAgICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiBjZGsuRHVyYXRpb24uZGF5cygyNTU1KSAvLyA3IHllYXJzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgQXJ0LiA5ICsgTU9QSCBhdWRpdCB0cmFpbC5cclxuICAgICAgICAvLyBJbW11dGFibGUgYXVkaXQgbG9nIGJ1Y2tldCDigJQgT2JqZWN0IExvY2sgaW4gY29tcGxpYW5jZSBtb2RlIHByZXZlbnRzXHJcbiAgICAgICAgLy8gdGFtcGVyaW5nIG9yIGRlbGV0aW9uIG9mIGF1ZGl0IHJlY29yZHMsIGV2ZW4gYnkgYWNjb3VudCBhZG1pbnMuXHJcbiAgICAgICAgLy8gNy15ZWFyIHJldGVudGlvbiBhbGlnbnMgd2l0aCBRYXRhciBoZWFsdGhjYXJlIHJlY29yZC1rZWVwaW5nIG5vcm1zLlxyXG4gICAgICAgIC8vIFZlcnNpb25pbmcgaXMgbWFuZGF0b3J5IGZvciBPYmplY3QgTG9jay5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhdWRpdEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1RpcnlhcUF1ZGl0QnVja2V0Jywge1xyXG4gICAgICAgICAgICBidWNrZXROYW1lOiBgdGlyeWFxLWF1ZGl0LSR7YWNjb3VudElkfS0ke3JlZ2lvbn1gLFxyXG4gICAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNUyxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxQXVkaXRLZXksXHJcbiAgICAgICAgICAgIGJ1Y2tldEtleUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgICAgICAgb2JqZWN0TG9ja0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG9iamVjdExvY2tEZWZhdWx0UmV0ZW50aW9uOiBzMy5PYmplY3RMb2NrUmV0ZW50aW9uLmNvbXBsaWFuY2UoY2RrLkR1cmF0aW9uLmRheXMoMjU1NSkpLCAvLyA3IHllYXJzXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogJ3RyYW5zaXRpb24tdG8tZ2xhY2llcicsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApIH1cclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uVHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5ERUVQX0FSQ0hJVkUsIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMTgwKSB9XHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMICsgTkNTQSBOSUEg4oCUIGluZnJhc3RydWN0dXJlLWxldmVsIGF1ZGl0LlxyXG4gICAgICAgIC8vIE11bHRpLXJlZ2lvbiB0cmFpbCB3aXRoIGxvZyBmaWxlIHZhbGlkYXRpb24uIENhcHR1cmVzIGV2ZXJ5IEFXUyBBUElcclxuICAgICAgICAvLyBjYWxsIChjb250cm9sIHBsYW5lKS4gU2VudCB0byB0aGUgaW1tdXRhYmxlIGF1ZGl0IGJ1Y2tldCBhYm92ZS5cclxuICAgICAgICAvLyBTMyBkYXRhIGV2ZW50cyBjYXB0dXJlZCBmb3IgdGhlIGZyb250ZW5kIGJ1Y2tldCBzbyB3ZSBjYW4gcHJvdmVcclxuICAgICAgICAvLyB3aG8gZG93bmxvYWRlZCB3aGF0IChQSEkgYWNjZXNzIHBhdGggdGhyb3VnaCBwcmUtc2lnbmVkIFVSTHMpLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHRyYWlsID0gbmV3IGNsb3VkdHJhaWwuVHJhaWwodGhpcywgJ1RpcnlhcUNsb3VkVHJhaWwnLCB7XHJcbiAgICAgICAgICAgIHRyYWlsTmFtZTogJ3RpcnlhcS1jbG91ZHRyYWlsJyxcclxuICAgICAgICAgICAgYnVja2V0OiBhdWRpdEJ1Y2tldCxcclxuICAgICAgICAgICAgczNLZXlQcmVmaXg6ICdjbG91ZHRyYWlsJyxcclxuICAgICAgICAgICAgaXNNdWx0aVJlZ2lvblRyYWlsOiB0cnVlLFxyXG4gICAgICAgICAgICBpbmNsdWRlR2xvYmFsU2VydmljZUV2ZW50czogdHJ1ZSxcclxuICAgICAgICAgICAgZW5hYmxlRmlsZVZhbGlkYXRpb246IHRydWUsXHJcbiAgICAgICAgICAgIHNlbmRUb0Nsb3VkV2F0Y2hMb2dzOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTG9nc1JldGVudGlvbjogY2RrLmF3c19sb2dzLlJldGVudGlvbkRheXMuT05FX1lFQVIsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb25LZXk6IHRpcnlhcUF1ZGl0S2V5XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIER5bmFtb0RCXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBJTVBPUlRBTlQg4oCUIEdTSSBERVBMT1lNRU5UIFJVTEU6XHJcbiAgICAgICAgLy8gRHluYW1vREIgb25seSBhbGxvd3MgT05FIEdTSSB0byBiZSBjcmVhdGVkIHBlciB0YWJsZSB1cGRhdGUuXHJcbiAgICAgICAgLy8gVGhpcyBtZWFucyBvbiBhIEZSRVNIIGRlcGxveSAobmV3IGFjY291bnQpLCBhbGwgNyBHU0lzIHdpbGwgYmVcclxuICAgICAgICAvLyBjcmVhdGVkIHN1Y2Nlc3NmdWxseSBiZWNhdXNlIENESyBjcmVhdGVzIHRoZSB0YWJsZSArIGFsbCBHU0lzXHJcbiAgICAgICAgLy8gaW4gdGhlIGluaXRpYWwgQ1JFQVRFIG9wZXJhdGlvbiAobm90IGFuIFVQREFURSkuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBIb3dldmVyIGlmIHlvdSBhZGQgYSBORVcgR1NJIHRvIGFuIGV4aXN0aW5nIHRhYmxlIHZpYSBjZGsgZGVwbG95LFxyXG4gICAgICAgIC8vIHlvdSBNVVNUIGFkZCBvbmx5IG9uZSBhdCBhIHRpbWUg4oCUIG90aGVyd2lzZSBDbG91ZEZvcm1hdGlvbiB3aWxsXHJcbiAgICAgICAgLy8gZmFpbCB3aXRoIFwiQ2Fubm90IHBlcmZvcm0gbW9yZSB0aGFuIG9uZSBHU0kgY3JlYXRpb24gb3IgZGVsZXRpb25cclxuICAgICAgICAvLyBpbiBhIHNpbmdsZSB1cGRhdGVcIi5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIEN1cnJlbnQgR1NJcyAoYWxsIGNyZWF0ZWQgb24gZnJlc2ggZGVwbG95KTpcclxuICAgICAgICAvLyAgIDEuIEVudGl0eVR5cGUtaW5kZXggICAgICAgICAg4oCUIG1haW4gcXVlcnkgaW5kZXhcclxuICAgICAgICAvLyAgIDIuIFBhdGllbnRJRC1pbmRleCAgICAgICAgICAg4oCUIHBhdGllbnQtcmVsYXRlZCBxdWVyaWVzXHJcbiAgICAgICAgLy8gICAzLiBlbWFpbC1pbmRleCAgICAgICAgICAgICAgIOKAlCBsb29rdXAgYnkgZW1haWxcclxuICAgICAgICAvLyAgIDQuIGRvY3RvckVtYWlsLWNyZWF0ZWRBdC1pbmRleCDigJQgZG9jdG9yIGVtYWlsICsgZGF0ZSBxdWVyaWVzXHJcbiAgICAgICAgLy8gICA1LiBHU0kxICAgICAgICAgICAgICAgICAgICAgIOKAlCBnZW5lcmljIEdTSSAoR1NJMVBLICsgR1NJMVNLKVxyXG4gICAgICAgIC8vICAgNi4gR1NJMiAgICAgICAgICAgICAgICAgICAgICDigJQgbmFtZSBzZWFyY2ggKG5hbWVfcHJlZml4ICsgbmFtZV9sb3dlcilcclxuICAgICAgICAvLyAgIDcuIGRhdGFDbGFzcy1pbmRleCAgICAgICAgICAg4oCUIFBEUFBMIGJyZWFjaCBzY29waW5nIChVcGRhdGUgMDYpXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBDb21wbGlhbmNlIOKAlCBldmVyeSBpdGVtIHdyaXR0ZW4gdG8gdGhpcyB0YWJsZSBTSE9VTEQgaW5jbHVkZSBhXHJcbiAgICAgICAgLy8gYGRhdGFDbGFzc2AgYXR0cmlidXRlIGRyYXduIGZyb20geyBQSEksIFBJSSwgUFVCTElDLCBBVURJVCwgU1lTVEVNIH1cclxuICAgICAgICAvLyBhbmQgYW4gT1BUSU9OQUwgYGV4cGlyZXNBdGAgKGVwb2NoIHNlY29uZHMpIGF0dHJpYnV0ZSB0aGF0IER5bmFtb0RCXHJcbiAgICAgICAgLy8gVFRMIHdpbGwgdXNlIHRvIGF1dG8tcHVyZ2UgdHJhbnNpZW50IHJlY29yZHMuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgdGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0hvc3BpdGFsVGFibGUnLCB7XHJcbiAgICAgICAgICAgIHRhYmxlTmFtZTogJ0hvc3BpdGFsJyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICAgICAgICBwb2ludEluVGltZVJlY292ZXJ5U3BlY2lmaWNhdGlvbjogeyBwb2ludEluVGltZVJlY292ZXJ5RW5hYmxlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQ1VTVE9NRVJfTUFOQUdFRCxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxRGF0YUtleSxcclxuICAgICAgICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAnZXhwaXJlc0F0J1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ0VudGl0eVR5cGUtaW5kZXgnLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ0VudGl0eVR5cGUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnUGF0aWVudElELWluZGV4JyxcclxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwYXRpZW50SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICAgICAgICBpbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdFbnRpdHlUeXBlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ2RvY3RvckVtYWlsLWNyZWF0ZWRBdC1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZG9jdG9yRW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgICAgICAgaW5kZXhOYW1lOiAnR1NJMScsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnR1NJMVBLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnR1NJMVNLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ0dTSTInLFxyXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ25hbWVfcHJlZml4JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnbmFtZV9sb3dlcicsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gQ29tcGxpYW5jZTogUERQUEwgYnJlYWNoIHNjb3BpbmcgKyBOQ1NBIE5JQSBkYXRhIGNsYXNzaWZpY2F0aW9uLlxyXG4gICAgICAgIC8vIExldHMgdXMgYW5zd2VyIFwic2hvdyBtZSBldmVyeSBQSEkgcmVjb3JkIHRvdWNoZWQgYmV0d2VlbiB0MSBhbmQgdDJcIlxyXG4gICAgICAgIC8vIHdpdGhvdXQgYSBmdWxsIHRhYmxlIHNjYW4gZHVyaW5nIGEgZm9yZW5zaWMgaW52ZXN0aWdhdGlvbi5cclxuICAgICAgICAvLyBTb3J0IGtleSA9IHVwZGF0ZWRBdCBzbyB3ZSBnZXQgaXRlbXMgaW4gY2hyb25vbG9naWNhbCBvcmRlci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ2RhdGFDbGFzcy1pbmRleCcsXHJcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZGF0YUNsYXNzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAndXBkYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLktFWVNfT05MWVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb2duaXRvIFVzZXIgUG9vbFxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIEFydC4gOSArIE1PUEggYWNjZXNzLWNvbnRyb2wgZXhwZWN0YXRpb25zLlxyXG4gICAgICAgIC8vIC0gUGFzc3dvcmQgcG9saWN5IGFsaWduZWQgd2l0aCBOQ1NBIE5JQTogMTIgY2hhcnMgbWluLCBhbGwgY2xhc3Nlcy5cclxuICAgICAgICAvLyAtIFRlbXBvcmFyeSBwYXNzd29yZCB2YWxpZGl0eSByZWR1Y2VkIHRvIDMgZGF5cyAoZm9yY2Ugcm90YXRpb24pLlxyXG4gICAgICAgIC8vIC0gTUZBIFJFUVVJUkVEIGZvciBldmVyeSB1c2VyOyBUT1RQIHByZWZlcnJlZCwgU01TIGZhbGxiYWNrLlxyXG4gICAgICAgIC8vIC0gQWR2YW5jZWQgU2VjdXJpdHkgYXVkaXRzIChDb2duaXRvIHRocmVhdCBwcm90ZWN0aW9uKSBlbmZvcmNlZC5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdUaXJ5YXFVc2VyUG9vbCcsIHtcclxuICAgICAgICAgICAgdXNlclBvb2xOYW1lOiAndGlyeWFxLXVzZXItcG9vbCcsXHJcbiAgICAgICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgc2lnbkluQWxpYXNlczogeyB1c2VybmFtZTogdHJ1ZSwgZW1haWw6IHRydWUgfSxcclxuICAgICAgICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgIGVtYWlsOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBmdWxsbmFtZTogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgZ2VuZGVyOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBwaG9uZU51bWJlcjogeyByZXF1aXJlZDogZmFsc2UsIG11dGFibGU6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIGJpcnRoZGF0ZTogeyByZXF1aXJlZDogZmFsc2UsIG11dGFibGU6IHRydWUgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgICAgICAgICAgbWluTGVuZ3RoOiAxMixcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVTeW1ib2xzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdGVtcFBhc3N3b3JkVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2UgcmVncmVzc2lvbjogTUZBIGZ1bGx5IGRpc2FibGVkIChSRVFVSVJFRCAtPiBPUFRJT05BTFxyXG4gICAgICAgICAgICAvLyAtPiBPRkYpIGJ5IHJlcXVlc3QuIFRoZSB0d28tc3RlcCBwYXRoIHdhcyBuZWVkZWQgYmVjYXVzZVxyXG4gICAgICAgICAgICAvLyBDb2duaXRvIHJlZnVzZXMgUkVRVUlSRUQgLT4gT0ZGIGRpcmVjdGx5IG9uIGEgbGl2ZSBwb29sLlxyXG4gICAgICAgICAgICAvLyBSZS1lbmFibGUgYnkgcmVzdG9yaW5nIE1mYS5SRVFVSVJFRCBhbmQgcmUtZGVwbG95aW5nLlxyXG4gICAgICAgICAgICBtZmE6IGNvZ25pdG8uTWZhLk9GRixcclxuICAgICAgICAgICAgLy8gbWZhU2Vjb25kRmFjdG9yIG5vdCBuZWVkZWQgd2hlbiBtZmEgaXMgT0ZGLlxyXG4gICAgICAgICAgICAvLyBtZmFTZWNvbmRGYWN0b3I6IHsgc21zOiB0cnVlLCBvdHA6IHRydWUgfSxcclxuICAgICAgICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICAgICAgICBzdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlOiBjb2duaXRvLlN0YW5kYXJkVGhyZWF0UHJvdGVjdGlvbk1vZGUuRlVMTF9GVU5DVElPTixcclxuICAgICAgICAgICAgZGV2aWNlVHJhY2tpbmc6IHtcclxuICAgICAgICAgICAgICAgIGNoYWxsZW5nZVJlcXVpcmVkT25OZXdEZXZpY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkZXZpY2VPbmx5UmVtZW1iZXJlZE9uVXNlclByb21wdDogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgYXBwQ2xpZW50ID0gdXNlclBvb2wuYWRkQ2xpZW50KCdUaXJ5YXFBcHBDbGllbnQnLCB7XHJcbiAgICAgICAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogJ1RpcnlhcScsXHJcbiAgICAgICAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcclxuICAgICAgICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB1c2VyU3JwOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgY3VzdG9tOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgICAgICAgICBmbG93czogeyBhdXRob3JpemF0aW9uQ29kZUdyYW50OiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICBzY29wZXM6IFtjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELCBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsIGNvZ25pdG8uT0F1dGhTY29wZS5QSE9ORSwgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEVdLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tVcmxzOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMC8nLCAnaHR0cHM6Ly9kNmk3aXdrbmtqMGJnLmNsb3VkZnJvbnQubmV0LyddLFxyXG4gICAgICAgICAgICAgICAgbG9nb3V0VXJsczogWydodHRwOi8vbG9jYWxob3N0OjQyMDAvJywgJ2h0dHBzOi8vZDZpN2l3a25rajBiZy5jbG91ZGZyb250Lm5ldC8nXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB1c2VyUG9vbC5hZGREb21haW4oJ1RpcnlhcURvbWFpbicsIHtcclxuICAgICAgICAgICAgY29nbml0b0RvbWFpbjogeyBkb21haW5QcmVmaXg6ICd0aXJ5YXEtaG9zcGl0YWwnIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgWydBZG1pbicsICdEZXZlbG9wZXJzJywgJ0RvY3RvcnMnLCAnUGhhcm1hY2lzdHMnXS5mb3JFYWNoKChncm91cE5hbWUpID0+IHtcclxuICAgICAgICAgICAgbmV3IGNvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCBgR3JvdXAke2dyb3VwTmFtZX1gLCB7XHJcbiAgICAgICAgICAgICAgICB1c2VyUG9vbElkOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAgICAgZ3JvdXBOYW1lLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGAke2dyb3VwTmFtZX0gZ3JvdXBgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBQcmUgVG9rZW4gR2VuZXJhdGlvbiBMYW1iZGFcclxuICAgICAgICAvLyBJbmplY3RzIGVtYWlsICsgbmFtZSBmcm9tIENvZ25pdG8gdXNlciBhdHRyaWJ1dGVzIGludG8gdGhlXHJcbiAgICAgICAgLy8gQWNjZXNzIFRva2VuIGNsYWltcyBzbyBhbGwgTGFtYmRhIGZ1bmN0aW9ucyBjYW4gaWRlbnRpZnkgdGhlIGFjdG9yLlxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIGNvbnN0IHByZVRva2VuRm4gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDb2duaXRvUHJlVG9rZW5HZW5lcmF0aW9uJywge1xyXG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICdjb2duaXRvLXByZS10b2tlbi1nZW5lcmF0aW9uJyxcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvY29nbml0by1wcmUtdG9rZW4tZ2VuZXJhdGlvbicpLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcHJlVG9rZW5Gbi5hZGRQZXJtaXNzaW9uKCdDb2duaXRvSW52b2tlJywge1xyXG4gICAgICAgICAgICBwcmluY2lwYWw6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY29nbml0by1pZHAuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICAgICAgICBzb3VyY2VBcm46IHVzZXJQb29sLnVzZXJQb29sQXJuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNmblVzZXJQb29sID0gdXNlclBvb2wubm9kZS5kZWZhdWx0Q2hpbGQgYXMgY29nbml0by5DZm5Vc2VyUG9vbDtcclxuICAgICAgICBjZm5Vc2VyUG9vbC5sYW1iZGFDb25maWcgPSB7XHJcbiAgICAgICAgICAgIHByZVRva2VuR2VuZXJhdGlvbkNvbmZpZzoge1xyXG4gICAgICAgICAgICAgICAgbGFtYmRhQXJuOiBwcmVUb2tlbkZuLmZ1bmN0aW9uQXJuLFxyXG4gICAgICAgICAgICAgICAgbGFtYmRhVmVyc2lvbjogJ1YzXzAnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTaGFyZWQgTGFtYmRhIGVudmlyb25tZW50ICsgaGVscGVyXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3Qgc2hhcmVkRW52ID0ge1xyXG4gICAgICAgICAgICBUQUJMRV9OQU1FOiAnSG9zcGl0YWwnLFxyXG4gICAgICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBmbiA9IChpZDogc3RyaW5nLCBmb2xkZXI6IHN0cmluZywgaGFuZGxlcjogc3RyaW5nLCBydW50aW1lOiBsYW1iZGEuUnVudGltZSA9IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLCBleHRyYUVudjogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9KSA9PlxyXG4gICAgICAgICAgICBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGlkLCB7XHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbk5hbWU6IGZvbGRlcixcclxuICAgICAgICAgICAgICAgIHJ1bnRpbWUsXHJcbiAgICAgICAgICAgICAgICBoYW5kbGVyLFxyXG4gICAgICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KGBsYW1iZGEvJHtmb2xkZXJ9YCksXHJcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDogeyAuLi5zaGFyZWRFbnYsIC4uLmV4dHJhRW52IH0sXHJcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIExhbWJkYSBmdW5jdGlvbnNcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBnZXRBbGxQYXRpZW50c0ZuID0gZm4oJ0dldEFsbFBhdGllbnRzJywgJ2dldEFsbFBhdGllbnRzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRQYXRpZW50QnlJREZuID0gZm4oJ0dldFBhdGllbnRCeUlEJywgJ2dldFBhdGllbnRCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBjcmVhdGVQYXRpZW50Rm4gPSBmbignQ3JlYXRlUGF0aWVudCcsICdjcmVhdGVQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCB1cGRhdGVQYXRpZW50Rm4gPSBmbignVXBkYXRlUGF0aWVudCcsICd1cGRhdGVQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBkZWxldGVQYXRpZW50Rm4gPSBmbignRGVsZXRlUGF0aWVudCcsICdkZWxldGVQYXRpZW50JywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRQYXRpZW50c0RhdGFCeUZpbHRlcnNGbiA9IGZuKCdHZXRQYXRpZW50c0RhdGFCeUZpbHRlcnMnLCAnZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXRBbGxEb2N0b3JzRm4gPSBmbignR2V0QWxsRG9jdG9ycycsICdnZXRBbGxEb2N0b3JzJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXREb2N0b3JCeUlERm4gPSBmbignR2V0RG9jdG9yQnlJRCcsICdnZXREb2N0b3JCeUlEJywgJ2luZGV4LmhhbmRsZXInKTtcclxuICAgICAgICBjb25zdCBnZXREb2N0b3JCeUVtYWlsRm4gPSBmbignR2V0RG9jdG9yQnlFbWFpbCcsICdnZXREb2N0b3JCeUVtYWlsJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlRG9jdG9yRm4gPSBmbignQ3JlYXRlRG9jdG9yJywgJ2NyZWF0ZURvY3RvcicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgdXBkYXRlRG9jdG9yRm4gPSBmbignVXBkYXRlRG9jdG9yJywgJ3VwZGF0ZURvY3RvcicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlRG9jdG9yRm4gPSBmbignRGVsZXRlRG9jdG9yJywgJ2RlbGV0ZURvY3RvcicsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgY3JlYXRlUGF0aWVudFBheW1lbnRGbiA9IGZuKCdDcmVhdGVQYXRpZW50UGF5bWVudCcsICdjcmVhdGVQYXRpZW50UGF5bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50Rm4gPSBmbignR2V0QWxsUGF5bWVudHNGb3JQYXRpZW50JywgJ2dldEFsbFBheW1lbnRzRm9yUGF0aWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SURGbiA9IGZuKCdMaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJRCcsICdsaXN0QWxsUGF5bWVudHNGb3JQYXRpZW50QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgdXBkYXRlUGF0aWVudFBheW1lbnRGbiA9IGZuKCdVcGRhdGVQYXRpZW50UGF5bWVudCcsICd1cGRhdGVQYXRpZW50UGF5bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0UGF5bWVudEJ5SURGbiA9IGZuKCdHZXRQYXltZW50QnlJRCcsICdnZXRQYXltZW50QnlJRCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZGVsZXRlUGF5bWVudEZuID0gZm4oJ0RlbGV0ZVBheW1lbnQnLCAnZGVsZXRlUGF5bWVudCcsICdpbmRleC5oYW5kbGVyJyk7XHJcbiAgICAgICAgY29uc3QgZ2V0QWxsSW52b2ljZXNGbiA9IGZuKCdHZXRBbGxJbnZvaWNlcycsICdnZXRBbGxJbnZvaWNlcycsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZVBhdGllbnRTdXJnZXJ5Rm4gPSBmbignQ3JlYXRlUGF0aWVudFN1cmdlcnknLCAnY3JlYXRlUGF0aWVudFN1cmdlcnknLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGxpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJREZuID0gZm4oJ0xpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJRCcsICdsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldFN1cmdlcnlCeUlERm4gPSBmbignR2V0U3VyZ2VyeUJ5SUQnLCAnZ2V0U3VyZ2VyeUJ5SUQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbERlcGFydG1lbnRzRm4gPSBmbignR2V0QWxsRGVwYXJ0bWVudHMnLCAnZ2V0QWxsRGVwYXJ0bWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZU5ld0RlcGFydG1lbnRGbiA9IGZuKCdDcmVhdGVOZXdEZXBhcnRtZW50JywgJ2NyZWF0ZU5ld0RlcGFydG1lbnQnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGJ1bGtDcmVhdGVEZXBhcnRtZW50c0ZuID0gZm4oJ0J1bGtDcmVhdGVEZXBhcnRtZW50cycsICdidWxrQ3JlYXRlRGVwYXJ0bWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUFsbERlcGFydG1lbnRzRm4gPSBmbignRGVsZXRlQWxsRGVwYXJ0bWVudHMnLCAnZGVsZXRlQWxsRGVwYXJ0bWVudHMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGdldEFsbFNwZWNpYWxpemF0aW9uc0ZuID0gZm4oJ0dldEFsbFNwZWNpYWxpemF0aW9ucycsICdnZXRBbGxTcGVjaWFsaXphdGlvbnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGNyZWF0ZU5ld1NwZWNpYWxpemF0aW9uRm4gPSBmbignQ3JlYXRlTmV3U3BlY2lhbGl6YXRpb24nLCAnY3JlYXRlTmV3U3BlY2lhbGl6YXRpb24nLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbiA9IGZuKCdCdWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zJywgJ2J1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGRlbGV0ZUFsbFNwZWNpYWxpemF0aW9uc0ZuID0gZm4oJ0RlbGV0ZUFsbFNwZWNpYWxpemF0aW9ucycsICdkZWxldGVBbGxTcGVjaWFsaXphdGlvbnMnLCAnaW5kZXguaGFuZGxlcicpO1xyXG4gICAgICAgIGNvbnN0IGFkbWluUGFuZWxGbiA9IGZuKCdUaXJ5YXFBZG1pblBhbmVsJywgJ3RpcnlhcS1hZG1pbi1wYW5lbCcsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gpO1xyXG4gICAgICAgIGNvbnN0IGV4YW1pbmF0aW9uc0ZuID0gZm4oJ1RpcnlhcUV4YW1pbmF0aW9ucycsICd0aXJ5YXEtZXhhbWluYXRpb25zJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgY29uc3QgcGhhcm1hY3lGbiA9IGZuKCdUaXJ5YXFQaGFybWFjeScsICd0aXJ5YXEtcGhhcm1hY3knLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBkb2N1bWVudE1hbmFnZXJGbiA9IGZuKCdUaXJ5YXFEb2N1bWVudE1hbmFnZXInLCAndGlyeWFxLWRvY3VtZW50LW1hbmFnZXInLCAnaW5kZXguaGFuZGxlcicsIGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YKTtcclxuICAgICAgICBjb25zdCBhdWRpdEZuID0gZm4oJ1RpcnlhcUF1ZGl0JywgJ3RpcnlhcS1hdWRpdCcsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gpO1xyXG4gICAgICAgIGNvbnN0IGFwcG9pbnRtZW50c0ZuID0gZm4oJ1RpcnlhcUFwcG9pbnRtZW50cycsICd0aXJ5YXEtYXBwb2ludG1lbnRzJywgJ2luZGV4LmhhbmRsZXInLCBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCk7XHJcbiAgICAgICAgLy8gSG9zcGl0YWwgY2FsZW5kYXIg4oCUIHJlcGxhY2VzIHRoZSBwcmV2aW91cyBleHRlcm5hbCBDYWxlbmRhclBsYXRmb3JtIFNhYVMuXHJcbiAgICAgICAgLy8gQWxsIGNhbGVuZGFyIGRhdGEgbm93IHBlcnNpc3RzIGluIHRoZSBIb3NwaXRhbCBEeW5hbW9EQiB0YWJsZSBmb3JcclxuICAgICAgICAvLyBQRFBQTCBkYXRhLXJlc2lkZW5jeSArIGNsaW5pY2FsLXByaXZhY3kgY29tcGxpYW5jZS5cclxuICAgICAgICBjb25zdCBjYWxlbmRhckZuID0gZm4oJ1RpcnlhcUNhbGVuZGFyJywgJ3RpcnlhcS1jYWxlbmRhcicsICdpbmRleC5oYW5kbGVyJywgbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gpO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTY3JpYmVGaXJzdCBQaGFzZSAxIOKAlCBTT0FQIGdlbmVyYXRpb24gTGFtYmRhLlxyXG4gICAgICAgIC8vIENhbGxzIEJlZHJvY2sgZm9yIHRyYW5zY3JpcHQg4oaSIFNPQVAgc3BsaXQ7IHdyaXRlcyBzZXNzaW9uICsgYXVkaXRcclxuICAgICAgICAvLyByb3dzIHRvIHRoZSBleGlzdGluZyBzaW5nbGUtdGFibGUuXHJcbiAgICAgICAgLy8gQkVEUk9DS19SRUdJT04gY2FuIGRpZmZlciBmcm9tIEFXU19SRUdJT04gd2hlbiBCZWRyb2NrIGlzbid0IHlldFxyXG4gICAgICAgIC8vIGF2YWlsYWJsZSBpbiB0aGUgZGF0YS1wbGFuZSByZWdpb24gKGUuZy4gbWUtc291dGgtMSBwcm9kdWN0aW9uKS5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzY3JpYmVGbiA9IGZuKFxyXG4gICAgICAgICAgICAnVGlyeWFxU2NyaWJlJyxcclxuICAgICAgICAgICAgJ3RpcnlhcS1zY3JpYmUnLFxyXG4gICAgICAgICAgICAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBCRURST0NLX1JFR0lPTjogJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgICAgICAgICBCRURST0NLX01PREVMX0lEOiAnYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgICAgIC8vIEFsbG93IEJlZHJvY2sgSW52b2tlTW9kZWwgb25seSBvbiB0aGUgSGFpa3UgbW9kZWwsIGluIHVzLWVhc3QtMS5cclxuICAgICAgICBzY3JpYmVGbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnYmVkcm9jazpJbnZva2VNb2RlbCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gRHluYW1vREIgcGVybWlzc2lvbnNcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhbGxGdW5jdGlvbnMgPSBbXHJcbiAgICAgICAgICAgIGdldEFsbFBhdGllbnRzRm4sXHJcbiAgICAgICAgICAgIGdldFBhdGllbnRCeUlERm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZVBhdGllbnRGbixcclxuICAgICAgICAgICAgdXBkYXRlUGF0aWVudEZuLFxyXG4gICAgICAgICAgICBkZWxldGVQYXRpZW50Rm4sXHJcbiAgICAgICAgICAgIGdldFBhdGllbnRzRGF0YUJ5RmlsdGVyc0ZuLFxyXG4gICAgICAgICAgICBnZXRBbGxEb2N0b3JzRm4sXHJcbiAgICAgICAgICAgIGdldERvY3RvckJ5SURGbixcclxuICAgICAgICAgICAgZ2V0RG9jdG9yQnlFbWFpbEZuLFxyXG4gICAgICAgICAgICBjcmVhdGVEb2N0b3JGbixcclxuICAgICAgICAgICAgdXBkYXRlRG9jdG9yRm4sXHJcbiAgICAgICAgICAgIGRlbGV0ZURvY3RvckZuLFxyXG4gICAgICAgICAgICBjcmVhdGVQYXRpZW50UGF5bWVudEZuLFxyXG4gICAgICAgICAgICBnZXRBbGxQYXltZW50c0ZvclBhdGllbnRGbixcclxuICAgICAgICAgICAgbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SURGbixcclxuICAgICAgICAgICAgdXBkYXRlUGF0aWVudFBheW1lbnRGbixcclxuICAgICAgICAgICAgZ2V0UGF5bWVudEJ5SURGbixcclxuICAgICAgICAgICAgZGVsZXRlUGF5bWVudEZuLFxyXG4gICAgICAgICAgICBnZXRBbGxJbnZvaWNlc0ZuLFxyXG4gICAgICAgICAgICBjcmVhdGVQYXRpZW50U3VyZ2VyeUZuLFxyXG4gICAgICAgICAgICBsaXN0QWxsU3VyZ2VyaWVzRm9yUGF0aWVudEJ5SURGbixcclxuICAgICAgICAgICAgZ2V0U3VyZ2VyeUJ5SURGbixcclxuICAgICAgICAgICAgZ2V0QWxsRGVwYXJ0bWVudHNGbixcclxuICAgICAgICAgICAgY3JlYXRlTmV3RGVwYXJ0bWVudEZuLFxyXG4gICAgICAgICAgICBidWxrQ3JlYXRlRGVwYXJ0bWVudHNGbixcclxuICAgICAgICAgICAgZGVsZXRlQWxsRGVwYXJ0bWVudHNGbixcclxuICAgICAgICAgICAgZ2V0QWxsU3BlY2lhbGl6YXRpb25zRm4sXHJcbiAgICAgICAgICAgIGNyZWF0ZU5ld1NwZWNpYWxpemF0aW9uRm4sXHJcbiAgICAgICAgICAgIGJ1bGtDcmVhdGVTcGVjaWFsaXphdGlvbnNGbixcclxuICAgICAgICAgICAgZGVsZXRlQWxsU3BlY2lhbGl6YXRpb25zRm4sXHJcbiAgICAgICAgICAgIGFkbWluUGFuZWxGbixcclxuICAgICAgICAgICAgZXhhbWluYXRpb25zRm4sXHJcbiAgICAgICAgICAgIHBoYXJtYWN5Rm4sXHJcbiAgICAgICAgICAgIGRvY3VtZW50TWFuYWdlckZuLFxyXG4gICAgICAgICAgICBhdWRpdEZuLFxyXG4gICAgICAgICAgICBhcHBvaW50bWVudHNGbixcclxuICAgICAgICAgICAgY2FsZW5kYXJGbixcclxuICAgICAgICAgICAgc2NyaWJlRm5cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBhbGxGdW5jdGlvbnMuZm9yRWFjaCgoZikgPT4ge1xyXG4gICAgICAgICAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZik7XHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2U6IExhbWJkYSBleGVjdXRpb24gcm9sZXMgbXVzdCBiZSBleHBsaWNpdGx5IGdyYW50ZWRcclxuICAgICAgICAgICAgLy8gS01TIEVuY3J5cHQvRGVjcnlwdCBvbiB0aGUgZGF0YSBDTUsgYmVjYXVzZSBEeW5hbW9EQiBDVVNUT01FUl9NQU5BR0VEXHJcbiAgICAgICAgICAgIC8vIGVuY3J5cHRpb24gcmVxdWlyZXMgdGhlIGNhbGxlciBwcmluY2lwYWwgdG8gaGF2ZSBrZXkgYWNjZXNzLlxyXG4gICAgICAgICAgICB0aXJ5YXFEYXRhS2V5LmdyYW50RW5jcnlwdERlY3J5cHQoZik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFNlZWQgTGFtYmRhIGFsc28gd3JpdGVzIHRvIHRoZSBlbmNyeXB0ZWQgdGFibGUuXHJcbiAgICAgICAgLy8gKGdyYW50ZWQgZnVydGhlciBkb3duIHdoZXJlIHNlZWRGbiBpcyBkZWZpbmVkLilcclxuXHJcbiAgICAgICAgYWRtaW5QYW5lbEZuLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpMaXN0VXNlcnMnLCAnY29nbml0by1pZHA6TGlzdFVzZXJzSW5Hcm91cCcsICdjb2duaXRvLWlkcDpBZG1pbkRpc2FibGVVc2VyJywgJ2NvZ25pdG8taWRwOkFkbWluRW5hYmxlVXNlcicsICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCddLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgLy8gU2VlZCBMYW1iZGEg4oCUIGRlcGFydG1lbnRzLCBzcGVjaWFsaXphdGlvbnMsIGNvdW50ZXJzXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3Qgc2VlZEZuID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGlyeWFxU2VlZEZ1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0aXJ5YXEtc2VlZCcsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDogeyBUQUJMRV9OQU1FOiAnSG9zcGl0YWwnIH0sXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxyXG5jb25zdCB7IER5bmFtb0RCQ2xpZW50IH0gPSByZXF1aXJlKCdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInKTtcclxuY29uc3QgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcclxuY29uc3QgeyByYW5kb21VVUlEIH0gPSByZXF1aXJlKCdjcnlwdG8nKTtcclxuY29uc3QgY2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKG5ldyBEeW5hbW9EQkNsaWVudCh7fSkpO1xyXG5jb25zdCBUQUJMRSAgPSBwcm9jZXNzLmVudi5UQUJMRV9OQU1FO1xyXG5jb25zdCBERVBBUlRNRU5UUyA9ICR7SlNPTi5zdHJpbmdpZnkoREVQQVJUTUVOVFMpfTtcclxuY29uc3QgU1BFQ0lBTElaQVRJT05TID0gJHtKU09OLnN0cmluZ2lmeShTUEVDSUFMSVpBVElPTlMpfTtcclxuXHJcbi8vIGF0dHJpYnV0ZV9ub3RfZXhpc3RzKFBLKSBtYWtlcyBldmVyeSBQdXQgaWRlbXBvdGVudCDigJQgZXhpc3Rpbmcgcm93cyBhcmVcclxuLy8gcHJlc2VydmVkLiBUaGlzIHByb3RlY3RzIHRoZSBwYXRpZW50L2RvY3RvciBjb3VudGVycyBmcm9tIGJlaW5nIHJlc2V0IG9uXHJcbi8vIGFueSBmdXR1cmUgcmVwbGF5IG9mIHRoaXMgQ3VzdG9tUmVzb3VyY2UuXHJcbmFzeW5jIGZ1bmN0aW9uIHB1dElmQWJzZW50KGl0ZW0pIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgY2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgICAgICBUYWJsZU5hbWU6IFRBQkxFLFxyXG4gICAgICAgICAgICBJdGVtOiBpdGVtLFxyXG4gICAgICAgICAgICBDb25kaXRpb25FeHByZXNzaW9uOiAnYXR0cmlidXRlX25vdF9leGlzdHMoUEspJ1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBpZiAoZS5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHJldHVybiBmYWxzZTtcclxuICAgICAgICB0aHJvdyBlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIC8vIFJlcXVlc3RUeXBlIGhhbmRsaW5nOlxyXG4gICAgLy8gICBDcmVhdGUg4oaSIHJ1biB0aGUgZnVsbCBzZWVkLlxyXG4gICAgLy8gICBVcGRhdGUg4oaSIE5PLU9QLiBSZWZlcmVuY2UgZGF0YSAoZGVwYXJ0bWVudHMsIHNwZWNpYWxpemF0aW9ucykgYW5kXHJcbiAgICAvLyAgICAgICAgICAgIGxpdmUgY291bnRlcnMgbXVzdCBub3QgYmUgcmVnZW5lcmF0ZWQgYXV0b21hdGljYWxseS4gVG9cclxuICAgIC8vICAgICAgICAgICAgcmUtc2VlZCBpbnRlbnRpb25hbGx5LCByZXBsYWNlIHRoaXMgQ3VzdG9tUmVzb3VyY2UgdmlhXHJcbiAgICAvLyAgICAgICAgICAgIGNvbnNvbGUgb3IgYnVtcCB0aGUgbG9naWNhbCBpZC5cclxuICAgIC8vICAgRGVsZXRlIOKGkiBOTy1PUC4gTmV2ZXIgZGVzdHJveSBzZWVkZWQgcmVmZXJlbmNlIGRhdGEgb24gc3RhY2sgZGVsZXRlLlxyXG4gICAgaWYgKGV2ZW50LlJlcXVlc3RUeXBlICE9PSAnQ3JlYXRlJykge1xyXG4gICAgICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogJ3NlZWQnLCBEYXRhOiB7IHNraXBwZWQ6IGV2ZW50LlJlcXVlc3RUeXBlIH0gfTtcclxuICAgIH1cclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgIGxldCB3cml0dGVuID0gMDtcclxuICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiAnQ09VTlRFUiNQQVRJRU5UUycsIFNLOiAnQ09VTlRFUicsIGNvdW50OiAwLCBFbnRpdHlUeXBlOiAnQ09VTlRFUicgfSkpIHdyaXR0ZW4rKztcclxuICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiAnQ09VTlRFUiNET0NUT1JTJywgIFNLOiAnQ09VTlRFUicsIGNvdW50OiAwLCBFbnRpdHlUeXBlOiAnQ09VTlRFUicgfSkpIHdyaXR0ZW4rKztcclxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBERVBBUlRNRU5UUykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gcmFuZG9tVVVJRCgpO1xyXG4gICAgICAgIGlmIChhd2FpdCBwdXRJZkFic2VudCh7IFBLOiBcXGBERVBBUlRNRU5UI1xcJHtpZH1cXGAsIFNLOiAnUFJPRklMRScsIEVudGl0eVR5cGU6ICdERVBBUlRNRU5UJywgZGVwYXJ0bWVudElkOiBpZCwgbmFtZSwgY3JlYXRlZEF0OiBub3cgfSkpIHdyaXR0ZW4rKztcclxuICAgIH1cclxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBTUEVDSUFMSVpBVElPTlMpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHJhbmRvbVVVSUQoKTtcclxuICAgICAgICBpZiAoYXdhaXQgcHV0SWZBYnNlbnQoeyBQSzogXFxgU1BFQ0lBTElaQVRJT04jXFwke2lkfVxcYCwgU0s6ICdQUk9GSUxFJywgRW50aXR5VHlwZTogJ1NQRUNJQUxJWkFUSU9OJywgc3BlY2lhbGl6YXRpb25JZDogaWQsIG5hbWUsIGNyZWF0ZWRBdDogbm93IH0pKSB3cml0dGVuKys7XHJcbiAgICB9XHJcbiAgICByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6ICdzZWVkJywgRGF0YTogeyB3cml0dGVuIH0gfTtcclxufTtcclxuICAgICAgICAgICAgYClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGFibGUuZ3JhbnRXcml0ZURhdGEoc2VlZEZuKTtcclxuICAgICAgICB0aXJ5YXFEYXRhS2V5LmdyYW50RW5jcnlwdERlY3J5cHQoc2VlZEZuKTtcclxuICAgICAgICBjb25zdCBzZWVkUHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ1NlZWRQcm92aWRlcicsIHsgb25FdmVudEhhbmRsZXI6IHNlZWRGbiB9KTtcclxuICAgICAgICAvLyBTdGFibGUgcHJvcGVydHkg4oCUIHNhbWUgb24gZXZlcnkgc3ludGgg4oCUIHNvIENsb3VkRm9ybWF0aW9uIGRvZXMgTk9UXHJcbiAgICAgICAgLy8gcmUtdHJpZ2dlciBhbiBVcGRhdGUgb2YgdGhlIFNlZWREYXRhIEN1c3RvbVJlc291cmNlIG9uIGBjZGsgZGVwbG95YC5cclxuICAgICAgICAvLyBQcmV2aW91c2x5IGB0aW1lc3RhbXA6IERhdGUubm93KClgIGNhdXNlZCB0aGUgc2VlZCBMYW1iZGEgdG8gcnVuIG9uXHJcbiAgICAgICAgLy8gZXZlcnkgZGVwbG95LCByZXNldHRpbmcgcGF0aWVudC9kb2N0b3IgY291bnRlcnMgYW5kIGR1cGxpY2F0aW5nXHJcbiAgICAgICAgLy8gZGVwYXJ0bWVudC9zcGVjaWFsaXphdGlvbiByZWNvcmRzLlxyXG4gICAgICAgIG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgJ1NlZWREYXRhJywge1xyXG4gICAgICAgICAgICBzZXJ2aWNlVG9rZW46IHNlZWRQcm92aWRlci5zZXJ2aWNlVG9rZW4sXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgc2VlZFZlcnNpb246IDEgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBDb21wbGlhbmNlOiBQRFBQTCBBcnQuIDkg4oCUIG5vIHNoYXJlZCAvIGhhcmRjb2RlZCBjcmVkZW50aWFscy5cclxuICAgICAgICAvLyBFYWNoIHNlZWRlZCB1c2VyIGdldHMgYSBDUllQVE9HUkFQSElDQUxMWSBSQU5ET00gdGVtcG9yYXJ5IHBhc3N3b3JkXHJcbiAgICAgICAgLy8gdGhhdCBzYXRpc2ZpZXMgdGhlIHN0cmVuZ3RoZW5lZCBwYXNzd29yZCBwb2xpY3kuIFRoZSBwYXNzd29yZCBpczpcclxuICAgICAgICAvLyAgIC0gaXNzdWVkIGFzIFRFTVBPUkFSWSAoUGVybWFuZW50PWZhbHNlKSBzbyBDb2duaXRvIGZvcmNlcyBhXHJcbiAgICAgICAgLy8gICAgIHBhc3N3b3JkIGNoYW5nZSBhdCBmaXJzdCBsb2dpbixcclxuICAgICAgICAvLyAgIC0gc3RvcmVkIGluIEFXUyBTZWNyZXRzIE1hbmFnZXIgdW5kZXJcclxuICAgICAgICAvLyAgICAgL3RpcnlhcS9zZWVkLXVzZXJzLzx1c2VybmFtZT4sIGVuY3J5cHRlZCB3aXRoIHRoZSBkYXRhIENNSyxcclxuICAgICAgICAvLyAgIC0gbmV2ZXIgbG9nZ2VkLCBuZXZlciByZXR1cm5lZCB0byB0aGUgQVBJIGNhbGxlci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCB1c2Vyc0ZuID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGlyeWFxVXNlcnNGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAndGlyeWFxLWNyZWF0ZS11c2VycycsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAgICAgREFUQV9LTVNfS0VZX0lEOiB0aXJ5YXFEYXRhS2V5LmtleUlkXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxyXG5jb25zdCB7IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LCBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kLCBBZG1pbkFkZFVzZXJUb0dyb3VwQ29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInKTtcclxuY29uc3QgeyBTZWNyZXRzTWFuYWdlckNsaWVudCwgQ3JlYXRlU2VjcmV0Q29tbWFuZCwgUHV0U2VjcmV0VmFsdWVDb21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJyk7XHJcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xyXG5cclxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7fSk7XHJcbmNvbnN0IHNlY3JldHMgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe30pO1xyXG5jb25zdCBQT09MID0gcHJvY2Vzcy5lbnYuVVNFUl9QT09MX0lEO1xyXG5jb25zdCBLRVkgID0gcHJvY2Vzcy5lbnYuREFUQV9LTVNfS0VZX0lEO1xyXG5cclxuY29uc3QgU0VFRF9VU0VSUyA9IFtcclxuICAgIHsgdXNlcm5hbWU6ICdhZG1pbjEnLCAgICAgIG5hbWU6ICdBZG1pbiBPbmUnLCAgICAgIGVtYWlsOiAnYWRtaW4xQHRpcnlhcS5jb20nLCAgICAgIGdyb3VwOiAnQWRtaW4nIH0sXHJcbiAgICB7IHVzZXJuYW1lOiAnYWRtaW4yJywgICAgICBuYW1lOiAnQWRtaW4gVHdvJywgICAgICBlbWFpbDogJ2FkbWluMkB0aXJ5YXEuY29tJywgICAgICBncm91cDogJ0FkbWluJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RldmVsb3BlcjEnLCAgbmFtZTogJ0RldmVsb3BlciBPbmUnLCAgZW1haWw6ICdkZXYxQHRpcnlhcS5jb20nLCAgICAgICAgZ3JvdXA6ICdEZXZlbG9wZXJzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RldmVsb3BlcjInLCAgbmFtZTogJ0RldmVsb3BlciBUd28nLCAgZW1haWw6ICdkZXYyQHRpcnlhcS5jb20nLCAgICAgICAgZ3JvdXA6ICdEZXZlbG9wZXJzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RvY3RvcjEnLCAgICAgbmFtZTogJ0RvY3RvciBPbmUnLCAgICAgZW1haWw6ICdkb2N0b3IxQHRpcnlhcS5jb20nLCAgICAgZ3JvdXA6ICdEb2N0b3JzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ2RvY3RvcjInLCAgICAgbmFtZTogJ0RvY3RvciBUd28nLCAgICAgZW1haWw6ICdkb2N0b3IyQHRpcnlhcS5jb20nLCAgICAgZ3JvdXA6ICdEb2N0b3JzJyB9LFxyXG4gICAgeyB1c2VybmFtZTogJ3BoYXJtYWNpc3QxJywgbmFtZTogJ1BoYXJtYWNpc3QgT25lJywgZW1haWw6ICdwaGFybWFjaXN0MUB0aXJ5YXEuY29tJywgZ3JvdXA6ICdQaGFybWFjaXN0cycgfSxcclxuICAgIHsgdXNlcm5hbWU6ICdwaGFybWFjaXN0MicsIG5hbWU6ICdQaGFybWFjaXN0IFR3bycsIGVtYWlsOiAncGhhcm1hY2lzdDJAdGlyeWFxLmNvbScsIGdyb3VwOiAnUGhhcm1hY2lzdHMnIH1cclxuXTtcclxuXHJcbi8vIEdlbmVyYXRlcyBhIDIwLWNoYXIgcGFzc3dvcmQgdGhhdCBhbHdheXMgc2F0aXNmaWVzIHRoZSBwb2xpY3k6XHJcbi8vIHVwcGVyLCBsb3dlciwgZGlnaXQsIHN5bWJvbCwgbGVuZ3RoID49IDEyLlxyXG5mdW5jdGlvbiBnZW5lcmF0ZVRlbXBQYXNzd29yZCgpIHtcclxuICAgIGNvbnN0IHVwcGVyID0gJ0FCQ0RFRkdISktMTU5QUVJTVFVWV1hZWic7XHJcbiAgICBjb25zdCBsb3dlciA9ICdhYmNkZWZnaGlqa21ucHFyc3R1dnd4eXonO1xyXG4gICAgY29uc3QgZGlnaXQgPSAnMjM0NTY3ODknO1xyXG4gICAgY29uc3Qgc3ltYm9sID0gJyFAIyQlXiYqKCktXz0rJztcclxuICAgIGNvbnN0IGFsbCA9IHVwcGVyICsgbG93ZXIgKyBkaWdpdCArIHN5bWJvbDtcclxuICAgIGNvbnN0IHBpY2sgPSAoc2V0KSA9PiBzZXRbY3J5cHRvLnJhbmRvbUludCgwLCBzZXQubGVuZ3RoKV07XHJcbiAgICBsZXQgcHdkID0gcGljayh1cHBlcikgKyBwaWNrKGxvd2VyKSArIHBpY2soZGlnaXQpICsgcGljayhzeW1ib2wpO1xyXG4gICAgd2hpbGUgKHB3ZC5sZW5ndGggPCAyMCkgcHdkICs9IHBpY2soYWxsKTtcclxuICAgIHJldHVybiBwd2Quc3BsaXQoJycpLnNvcnQoKCkgPT4gY3J5cHRvLnJhbmRvbUludCgwLCAyKSAtIDEpLmpvaW4oJycpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdG9yZVNlY3JldCh1c2VybmFtZSwgcGFzc3dvcmQpIHtcclxuICAgIGNvbnN0IG5hbWUgPSAnL3RpcnlhcS9zZWVkLXVzZXJzLycgKyB1c2VybmFtZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgc2VjcmV0cy5zZW5kKG5ldyBDcmVhdGVTZWNyZXRDb21tYW5kKHtcclxuICAgICAgICAgICAgTmFtZTogbmFtZSxcclxuICAgICAgICAgICAgRGVzY3JpcHRpb246ICdUZW1wb3JhcnkgcGFzc3dvcmQgZm9yIHNlZWRlZCBUaXJ5YXEgdXNlciDigJQgbXVzdCBiZSBjaGFuZ2VkIG9uIGZpcnN0IGxvZ2luLicsXHJcbiAgICAgICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZSwgdGVtcG9yYXJ5UGFzc3dvcmQ6IHBhc3N3b3JkLCBtdXN0Q2hhbmdlOiB0cnVlIH0pLFxyXG4gICAgICAgICAgICBLbXNLZXlJZDogS0VZXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGlmIChlLm5hbWUgPT09ICdSZXNvdXJjZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgICAgICAgYXdhaXQgc2VjcmV0cy5zZW5kKG5ldyBQdXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgU2VjcmV0SWQ6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWUsIHRlbXBvcmFyeVBhc3N3b3JkOiBwYXNzd29yZCwgbXVzdENoYW5nZTogdHJ1ZSB9KVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xyXG4gICAgaWYgKGV2ZW50LlJlcXVlc3RUeXBlID09PSAnRGVsZXRlJykgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAndXNlcnMnIH07XHJcbiAgICBmb3IgKGNvbnN0IHVzZXIgb2YgU0VFRF9VU0VSUykge1xyXG4gICAgICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGdlbmVyYXRlVGVtcFBhc3N3b3JkKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gUGVybWFuZW50PWZhbHNlIChkZWZhdWx0KSDihpIgQ29nbml0byBmbGFncyBGT1JDRV9DSEFOR0VfUEFTU1dPUkQuXHJcbiAgICAgICAgICAgIGF3YWl0IGNvZ25pdG8uc2VuZChuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgICAgICAgICBVc2VyUG9vbElkOiBQT09MLFxyXG4gICAgICAgICAgICAgICAgVXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnLFxyXG4gICAgICAgICAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgICAgICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBOYW1lOiAnZW1haWwnLCAgICAgICAgICBWYWx1ZTogdXNlci5lbWFpbCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ2VtYWlsX3ZlcmlmaWVkJywgVmFsdWU6ICd0cnVlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ25hbWUnLCAgICAgICAgICAgVmFsdWU6IHVzZXIubmFtZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgTmFtZTogJ2dlbmRlcicsICAgICAgICAgVmFsdWU6ICdNYWxlJyB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkFkZFVzZXJUb0dyb3VwQ29tbWFuZCh7XHJcbiAgICAgICAgICAgICAgICBVc2VyUG9vbElkOiBQT09MLCBVc2VybmFtZTogdXNlci51c2VybmFtZSwgR3JvdXBOYW1lOiB1c2VyLmdyb3VwXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgYXdhaXQgc3RvcmVTZWNyZXQodXNlci51c2VybmFtZSwgdGVtcFBhc3N3b3JkKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGlmIChlLm5hbWUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIC8vIFVzZXIgYWxyZWFkeSBleGlzdHMg4oCUIGRvIG5vdCByZXNldCB0aGVpciBwYXNzd29yZCBzaWxlbnRseS5cclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiAndXNlcnMnIH07XHJcbn07XHJcbiAgICAgICAgICAgIGApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHVzZXJzRm4uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQWRkVXNlclRvR3JvdXAnXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdXNlcnNGbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6Q3JlYXRlU2VjcmV0JyxcclxuICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6UHV0U2VjcmV0VmFsdWUnLFxyXG4gICAgICAgICAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpEZXNjcmliZVNlY3JldCdcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzZWNyZXRzbWFuYWdlcjoke3JlZ2lvbn06JHthY2NvdW50SWR9OnNlY3JldDovdGlyeWFxL3NlZWQtdXNlcnMvKmBdXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gTGFtYmRhIG11c3QgYmUgYWxsb3dlZCB0byB1c2UgdGhlIGRhdGEgQ01LIHRvIGVuY3J5cHQgdGhlIHNlY3JldC5cclxuICAgICAgICB0aXJ5YXFEYXRhS2V5LmdyYW50RW5jcnlwdERlY3J5cHQodXNlcnNGbik7XHJcblxyXG4gICAgICAgIGNvbnN0IHVzZXJzUHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ1VzZXJzUHJvdmlkZXInLCB7IG9uRXZlbnRIYW5kbGVyOiB1c2Vyc0ZuIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgJ0NyZWF0ZVVzZXJzJywge1xyXG4gICAgICAgICAgICBzZXJ2aWNlVG9rZW46IHVzZXJzUHJvdmlkZXIuc2VydmljZVRva2VuLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHVzZXJQb29sSWQ6IHVzZXJQb29sLnVzZXJQb29sSWQgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBBUEkgR2F0ZXdheSArIEpXVCBBdXRob3JpemVyXHJcbiAgICAgICAgLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgICAgICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBIdHRwSnd0QXV0aG9yaXplcignVGlyeWFxQXV0aG9yaXplcicsIGBodHRwczovL2NvZ25pdG8taWRwLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tLyR7dXNlclBvb2wudXNlclBvb2xJZH1gLCB7XHJcbiAgICAgICAgICAgIGp3dEF1ZGllbmNlOiBbYXBwQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRdLFxyXG4gICAgICAgICAgICBpZGVudGl0eVNvdXJjZTogWyckcmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbiddXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIEFydC4gOSAoaW50ZWdyaXR5ICYgY29uZmlkZW50aWFsaXR5KS5cclxuICAgICAgICAvLyBDT1JTIGlzIHJlc3RyaWN0ZWQgdG8gdGhlIHByb2R1Y3Rpb24gQ2xvdWRGcm9udCBkb21haW4gcGx1cyBsb2NhbGhvc3RcclxuICAgICAgICAvLyBmb3IgZGV2LiBXaWxkY2FyZCBvcmlnaW5zIGFyZSBmb3JiaWRkZW4g4oCUIHRoZXkgZW5hYmxlIGNyb3NzLXNpdGUgZGF0YVxyXG4gICAgICAgIC8vIGV4ZmlsdHJhdGlvbiBmcm9tIHRoZSBwYXRpZW50J3MgYnJvd3Nlci5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBhbGxvd2VkT3JpZ2lucyA9IFtcclxuICAgICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMCcsXHJcbiAgICAgICAgICAgICdodHRwczovL2Q2aTdpd2tua2owYmcuY2xvdWRmcm9udC5uZXQnLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly9ha3dhZG9uYS5jb20nLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly93d3cuYWt3YWRvbmEuY29tJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgYXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnVGlyeWFxSHR0cEFwaScsIHtcclxuICAgICAgICAgICAgYXBpTmFtZTogJ3RpcnlhcS1hcGknLFxyXG4gICAgICAgICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgICAgICAgICBhbGxvd09yaWdpbnM6IGFsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5HRVQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuUEFUQ0gsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5PUFRJT05TXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXHJcbiAgICAgICAgICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgcm91dGUgPSAocGF0aDogc3RyaW5nLCBtZXRob2RzOiBhcGlnd3YyLkh0dHBNZXRob2RbXSwgaGFuZGxlcjogbGFtYmRhLkZ1bmN0aW9uKSA9PlxyXG4gICAgICAgICAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzLFxyXG4gICAgICAgICAgICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24ocGF0aC5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJycpICsgbWV0aG9kcy5qb2luKCcnKSwgaGFuZGxlciksXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVyXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxQYXRpZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRQYXRpZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHVwZGF0ZVBhdGllbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfScsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3Jlc3RvcmUnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlUGF0aWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3NlYXJjaCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0UGF0aWVudHNEYXRhQnlGaWx0ZXJzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsRG9jdG9yc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RvY3RvcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVEb2N0b3JGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL3tkb2N0b3JJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldERvY3RvckJ5SURGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL3tkb2N0b3JJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgdXBkYXRlRG9jdG9yRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdG9ycy97ZG9jdG9ySUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVEb2N0b3JGbik7XHJcbiAgICAgICAgcm91dGUoJy9kb2N0b3JzL2VtYWlsL3tlbWFpbH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldERvY3RvckJ5RW1haWxGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9wYXltZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsUGF5bWVudHNGb3JQYXRpZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBjcmVhdGVQYXRpZW50UGF5bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzL3twYXltZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRQYXltZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3BheW1lbnRzL3twYXltZW50SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5QQVRDSF0sIHVwZGF0ZVBhdGllbnRQYXltZW50Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGF0aWVudHMve3BhdGllbnRJRH0vcGF5bWVudHMve3BheW1lbnRJRH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGRlbGV0ZVBheW1lbnRGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXltZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgbGlzdEFsbFBheW1lbnRzRm9yUGF0aWVudEJ5SURGbik7XHJcbiAgICAgICAgcm91dGUoJy9pbnZvaWNlcycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgZ2V0QWxsSW52b2ljZXNGbik7XHJcbiAgICAgICAgcm91dGUoJy9wYXRpZW50cy97cGF0aWVudElEfS9zdXJnZXJpZXMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGxpc3RBbGxTdXJnZXJpZXNGb3JQYXRpZW50QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL3BhdGllbnRzL3twYXRpZW50SUR9L3N1cmdlcmllcycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZVBhdGllbnRTdXJnZXJ5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3VyZ2VyaWVzL3tzdXJnZXJ5SUR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRTdXJnZXJ5QnlJREZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBnZXRBbGxEZXBhcnRtZW50c0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY3JlYXRlTmV3RGVwYXJ0bWVudEZuKTtcclxuICAgICAgICByb3V0ZSgnL2RlcGFydG1lbnRzL2J1bGsnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBidWxrQ3JlYXRlRGVwYXJ0bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9kZXBhcnRtZW50cycsIFthcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZGVsZXRlQWxsRGVwYXJ0bWVudHNGbik7XHJcbiAgICAgICAgcm91dGUoJy9zcGVjaWFsaXphdGlvbnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIGdldEFsbFNwZWNpYWxpemF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL3NwZWNpYWxpemF0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGNyZWF0ZU5ld1NwZWNpYWxpemF0aW9uRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zL2J1bGsnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBidWxrQ3JlYXRlU3BlY2lhbGl6YXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc3BlY2lhbGl6YXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBkZWxldGVBbGxTcGVjaWFsaXphdGlvbnNGbik7XHJcbiAgICAgICAgcm91dGUoJy9hZG1pbi9zdGF0cycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3VzZXJzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYWRtaW4vdXNlcnMve3VzZXJuYW1lfS9kaXNhYmxlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3VzZXJzL3t1c2VybmFtZX0vZW5hYmxlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL3VzZXJzL3t1c2VybmFtZX0vc2V0LXBhc3N3b3JkJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYWRtaW5QYW5lbEZuKTtcclxuICAgICAgICByb3V0ZSgnL2FkbWluL2F1ZGl0JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBhZG1pblBhbmVsRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZXhhbWluYXRpb25zL3tleGFtSWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGV4YW1pbmF0aW9uc0ZuKTtcclxuICAgICAgICByb3V0ZSgnL2V4YW1pbmF0aW9ucy97ZXhhbUlkfS9zaWdub2ZmJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgZXhhbWluYXRpb25zRm4pO1xyXG4gICAgICAgIC8vIFBoYXJtYWN5IHJvdXRlcyDigJQgcGF0aHMgbWF0Y2ggdGhlIHRpcnlhcS1waGFybWFjeSBMYW1iZGEncyBpbnRlcm5hbCByb3V0ZXIuXHJcbiAgICAgICAgLy8gKExhbWJkYSBkaXNwYXRjaGVzIG9uIGV2ZW50LnJhd1BhdGg7IENESyBtdXN0IHJlZ2lzdGVyIGlkZW50aWNhbCBwYXRocy4pXHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9tZWRpY2F0aW9ucycsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvbWVkaWNhdGlvbnMve21lZElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0gsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2ludmVudG9yeScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvcGhhcm1hY3kvaW52ZW50b3J5L3ttZWRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9wcmVzY3JpcHRpb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9wcmVzY3JpcHRpb25zL3tyeElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUEFUQ0hdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L2Rpc3BlbnNlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9wdXJjaGFzZS1vcmRlcnMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBwaGFybWFjeUZuKTtcclxuICAgICAgICByb3V0ZSgnL3BoYXJtYWN5L3B1cmNoYXNlLW9yZGVycy97cG9JZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENIXSwgcGhhcm1hY3lGbik7XHJcbiAgICAgICAgcm91dGUoJy9waGFybWFjeS9hbGVydHMnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIHBoYXJtYWN5Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL3tkb2N1bWVudElkfScsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgZG9jdW1lbnRNYW5hZ2VyRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvZG9jdW1lbnRzL3tkb2N1bWVudElkfS9wcmVzaWduJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLCBkb2N1bWVudE1hbmFnZXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9hdWRpdCcsIFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sIGF1ZGl0Rm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYXBwb2ludG1lbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgYXBwb2ludG1lbnRzRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvYXBwb2ludG1lbnRzL3thcHB0SWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sIGFwcG9pbnRtZW50c0ZuKTtcclxuXHJcbiAgICAgICAgLy8gSG9zcGl0YWwgY2FsZW5kYXIgcm91dGVzIOKAlCBUaXJ5YXEtbG9jYWwsIEpXVC1hdXRoZW50aWNhdGVkLlxyXG4gICAgICAgIHJvdXRlKCcvY2FsZW5kYXJzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY2FsZW5kYXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMve2NhbGVuZGFySWR9JywgW2FwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLCBjYWxlbmRhckZuKTtcclxuICAgICAgICByb3V0ZSgnL2NhbGVuZGFycy97Y2FsZW5kYXJJZH0vZXZlbnRzJywgW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgY2FsZW5kYXJGbik7XHJcbiAgICAgICAgcm91dGUoJy9jYWxlbmRhcnMve2NhbGVuZGFySWR9L2V2ZW50cy97ZXZlbnRJZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBBVENILCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSwgY2FsZW5kYXJGbik7XHJcblxyXG4gICAgICAgIC8vIFNjcmliZUZpcnN0IFBoYXNlIDEg4oCUIFNPQVAgc2NyaWJlIHJvdXRlc1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgc2NyaWJlRm4pO1xyXG4gICAgICAgIHJvdXRlKCcvc2NyaWJlL3Nlc3Npb25zL3tpZH0nLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sIHNjcmliZUZuKTtcclxuICAgICAgICByb3V0ZSgnL3NjcmliZS9zZXNzaW9ucy97aWR9L3NvYXAnLCBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLCBzY3JpYmVGbik7XHJcbiAgICAgICAgcm91dGUoJy9zY3JpYmUvc2Vzc2lvbnMve2lkfS9hcHByb3ZlJywgW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSwgc2NyaWJlRm4pO1xyXG5cclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICAvLyBTMyArIENsb3VkRnJvbnRcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBjb25zdCBzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVGlyeWFxRnJvbnRlbmRCdWNrZXQnLCB7XHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IGZhbHNlLFxyXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNUyxcclxuICAgICAgICAgICAgZW5jcnlwdGlvbktleTogdGlyeWFxRGF0YUtleSxcclxuICAgICAgICAgICAgYnVja2V0S2V5RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICAgICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiBhY2Nlc3NMb2dzQnVja2V0LFxyXG4gICAgICAgICAgICBzZXJ2ZXJBY2Nlc3NMb2dzUHJlZml4OiAnczMtYWNjZXNzL2Zyb250ZW5kLycsXHJcbiAgICAgICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICdleHBpcmUtbm9uY3VycmVudC12ZXJzaW9ucycsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDE4MClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBvYWMgPSBuZXcgY2xvdWRmcm9udC5TM09yaWdpbkFjY2Vzc0NvbnRyb2wodGhpcywgJ1RpcnlhcU9BQycsIHtcclxuICAgICAgICAgICAgc2lnbmluZzogY2xvdWRmcm9udC5TaWduaW5nLlNJR1Y0X05PX09WRVJSSURFXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnVGlyeWFxRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcclxuICAgICAgICAgICAgICAgIG9yaWdpbjogY2xvdWRmcm9udE9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2woc2l0ZUJ1Y2tldCwge1xyXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0NvbnRyb2w6IG9hY1xyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICAgICAgICBjYWNoZVBvbGljeTogQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQUQsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IGNsb3VkZnJvbnQuUmVzcG9uc2VIZWFkZXJzUG9saWN5LlNFQ1VSSVRZX0hFQURFUlNcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgICAgICAgICAgbWluaW11bVByb3RvY29sVmVyc2lvbjogY2xvdWRmcm9udC5TZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8yXzIwMjEsXHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2UgcmVncmVzc2lvbjogV0FGIHRlbXBvcmFyaWx5IGRpc2FibGVkIHRvIHN0b3AgY2hhcmdlcy5cclxuICAgICAgICAgICAgLy8gUmUtZW5hYmxlIGJ5IHNldHRpbmcgd2ViQWNsSWQgYmFjayB0byBwcm9wcz8ud2ViQWNsQXJuIGFuZFxyXG4gICAgICAgICAgICAvLyByZS1pbnN0YXRpbmcgdGhlIFRpcnlhcUVkZ2VTdGFjayBpbiBiaW4vdGlyeWFxLWNkay50cy5cclxuICAgICAgICAgICAgLy8gd2ViQWNsSWQ6IHByb3BzPy53ZWJBY2xBcm4sXHJcbiAgICAgICAgICAgIC8vIENvbXBsaWFuY2U6IFBEUFBMIGF1ZGl0IHRyYWlsIOKAlCBsb2cgZXZlcnkgQ2xvdWRGcm9udCByZXF1ZXN0XHJcbiAgICAgICAgICAgIC8vICh2aWV3ZXIgSVAsIHJlcXVlc3QgVVJJLCByZXNwb25zZSBzdGF0dXMpLiBTZW50IHRvIHRoZVxyXG4gICAgICAgICAgICAvLyBzZXJ2aWNlLWxvZ3MgYnVja2V0IGJlY2F1c2UgQ2xvdWRGcm9udCBjYW5ub3QgZGVsaXZlciB0byBhblxyXG4gICAgICAgICAgICAvLyBTU0UtS01TIGRlc3RpbmF0aW9uLlxyXG4gICAgICAgICAgICBlbmFibGVMb2dnaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICBsb2dCdWNrZXQ6IGFjY2Vzc0xvZ3NCdWNrZXQsXHJcbiAgICAgICAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdjbG91ZGZyb250LycsXHJcbiAgICAgICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXHJcbiAgICAgICAgICAgICAgICB7IGh0dHBTdGF0dXM6IDQwMywgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcgfSxcclxuICAgICAgICAgICAgICAgIHsgaHR0cFN0YXR1czogNDA0LCByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCwgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyB9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGNvbW1lbnQ6ICdUaXJ5YXEgSG9zcGl0YWwgUGxhdGZvcm0nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNpdGVCdWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW2Ake3NpdGVCdWNrZXQuYnVja2V0QXJufS8qYF0sXHJcbiAgICAgICAgICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjbG91ZGZyb250LmFtYXpvbmF3cy5jb20nKV0sXHJcbiAgICAgICAgICAgICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdBV1M6U291cmNlQXJuJzogYGFybjphd3M6Y2xvdWRmcm9udDo6JHthY2NvdW50SWR9OmRpc3RyaWJ1dGlvbi8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZH1gXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gICAgICAgIC8vIE91dHB1dHNcclxuICAgICAgICAvLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywgeyB2YWx1ZTogYXBpLmFwaUVuZHBvaW50LCBkZXNjcmlwdGlvbjogJ0hUVFAgQVBJIFVSTCDihpIgdXBkYXRlIENvbmZpZy50cyB0aXJ5YXFVcmwnIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250VXJsJywgeyB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLCBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIFVSTCDihpIgdXBkYXRlIGNhbGxiYWNrVXJscyArIGxvZ291dFVybHMgdGhlbiByZWRlcGxveScgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1MzQnVja2V0TmFtZScsIHsgdmFsdWU6IHNpdGVCdWNrZXQuYnVja2V0TmFtZSwgZGVzY3JpcHRpb246ICdTMyBidWNrZXQg4oaSIG5nIGJ1aWxkICsgYXdzIHMzIHN5bmMnIH0pO1xyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywgeyB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCwgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCDihpIgdXBkYXRlIGFwcC5jb25maWcudHMgYXV0aG9yaXR5JyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwQ2xpZW50SWQnLCB7IHZhbHVlOiBhcHBDbGllbnQudXNlclBvb2xDbGllbnRJZCwgZGVzY3JpcHRpb246ICdDb2duaXRvIEFwcCBDbGllbnQgSUQg4oaSIHVwZGF0ZSBhcHAuY29uZmlnLnRzIGNsaWVudElkJyB9KTtcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uSWQnLCB7IHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQg4oaSIGNhY2hlIGludmFsaWRhdGlvbicgfSk7XHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9BdXRob3JpdHknLCB7IHZhbHVlOiBgaHR0cHM6Ly9jb2duaXRvLWlkcC4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8ke3VzZXJQb29sLnVzZXJQb29sSWR9YCwgZGVzY3JpcHRpb246ICdDb2duaXRvIGF1dGhvcml0eSBVUkwg4oaSIHVwZGF0ZSBhcHAuY29uZmlnLnRzJyB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=