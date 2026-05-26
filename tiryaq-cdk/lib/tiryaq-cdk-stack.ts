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

export interface TiryaqStackProps extends cdk.StackProps {
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

export class TiryaqStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: TiryaqStackProps) {
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
        tiryaqAuditKey.addToResourcePolicy(
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

        const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;
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

        const fn = (id: string, folder: string, handler: string, runtime: lambda.Runtime = lambda.Runtime.NODEJS_18_X, extraEnv: Record<string, string> = {}) =>
            new lambda.Function(this, id, {
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
        const scribeFn = fn(
            'TiryaqScribe',
            'tiryaq-scribe',
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
            }
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

        adminPanelFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['cognito-idp:ListUsers', 'cognito-idp:ListUsersInGroup', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminEnableUser', 'cognito-idp:AdminSetUserPassword'],
                resources: [userPool.userPoolArn]
            })
        );

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
                resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:/tiryaq/seed-users/*`]
            })
        );

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
        const authorizer = new HttpJwtAuthorizer('TiryaqAuthorizer', `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`, {
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
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: CachePolicy.CACHING_OPTIMIZED,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
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
