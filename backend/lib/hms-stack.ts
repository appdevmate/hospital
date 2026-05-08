import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';

interface EntityConfig {
  tableName: string;
  pkName: string;
  skName?: string;
  gsiName?: string;
  pathSegment: string;
  s3Access?: boolean;
}

export interface HmsStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
}

const ENTITIES: EntityConfig[] = [
  { tableName: 'Patients',        pkName: 'patientId',      pathSegment: 'patients' },
  { tableName: 'Appointments',    pkName: 'appointmentId',  skName: 'patientId',      gsiName: 'by-patient-index',      pathSegment: 'appointments' },
  { tableName: 'Consultations',   pkName: 'consultationId', skName: 'patientId',      gsiName: 'by-patient-index',      pathSegment: 'consultations' },
  { tableName: 'ClinicalDiagnosis', pkName: 'diagnosisId',  skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'clinical-diagnosis' },
  { tableName: 'TreatmentPlans',  pkName: 'planId',         skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'treatment-plans' },
  { tableName: 'DoctorNotes',     pkName: 'noteId',         skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'doctor-notes' },
  { tableName: 'Referrals',       pkName: 'referralId',     skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'referrals' },
  { tableName: 'Prescriptions',   pkName: 'prescriptionId', skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'prescriptions' },
  { tableName: 'LabResults',      pkName: 'resultId',       skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'lab-results',       s3Access: true },
  { tableName: 'RadiologyResults',pkName: 'resultId',       skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'radiology-results', s3Access: true },
  { tableName: 'FollowUps',       pkName: 'followUpId',     skName: 'consultationId', gsiName: 'by-consultation-index', pathSegment: 'follow-ups' },
];

export class HmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HmsStackProps) {
    super(scope, id, props);

    // ── S3: medical media storage ─────────────────────────────────────────────
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `clinify-medical-media-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── API Gateway ───────────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'HmsApi', {
      restApiName: 'clinify-hms-api',
      description: 'Clinify HMS — Patient Management System',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
    });

    // ── Cognito authorizer ────────────────────────────────────────────────────
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'HmsAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'clinify-hms-authorizer',
      identitySource: 'method.request.header.Authorization',
    });

    const auth: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // ── Entity tables + Lambdas + routes ──────────────────────────────────────
    for (const entity of ENTITIES) {
      this.addEntity(api, entity, mediaBucket, auth);
    }

    // ── Media Lambda (presigned S3 URLs) ──────────────────────────────────────
    const mediaFn = new lambdaNodejs.NodejsFunction(this, 'MediaFunction', {
      functionName: 'clinify-hms-media',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/hms-media.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: { BUCKET_NAME: mediaBucket.bucketName },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/client-s3'],
      },
    });

    mediaBucket.grantReadWrite(mediaFn);

    const mediaResource = api.root.addResource('media');
    const mediaInt = new apigateway.LambdaIntegration(mediaFn);
    mediaResource.addResource('upload-url').addMethod('POST', mediaInt, auth);
    mediaResource.addResource('download-url').addMethod('GET', mediaInt, auth);

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'HmsApiUrl', {
      value: api.url,
      description: 'HMS API base URL',
      exportName: 'ClinifyHmsApiUrl',
    });
    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: mediaBucket.bucketName,
      description: 'S3 bucket for lab reports and radiology images',
      exportName: 'ClinifyMediaBucket',
    });
  }

  private addEntity(
    api: apigateway.RestApi,
    config: EntityConfig,
    mediaBucket: s3.Bucket,
    auth: apigateway.MethodOptions,
  ): void {
    const { tableName, pkName, skName, gsiName, pathSegment, s3Access } = config;

    const table = new dynamodb.Table(this, `${tableName}Table`, {
      tableName,
      partitionKey: { name: pkName, type: dynamodb.AttributeType.STRING },
      ...(skName ? { sortKey: { name: skName, type: dynamodb.AttributeType.STRING } } : {}),
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    if (skName && gsiName) {
      table.addGlobalSecondaryIndex({
        indexName: gsiName,
        partitionKey: { name: skName, type: dynamodb.AttributeType.STRING },
        sortKey:      { name: pkName, type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }

    const fn = new lambdaNodejs.NodejsFunction(this, `${tableName}Function`, {
      functionName: `clinify-hms-${pathSegment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/hms-crud.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: tableName,
        PK_NAME:    pkName,
        ...(skName  ? { SK_NAME:  skName  } : {}),
        ...(gsiName ? { GSI_NAME: gsiName } : {}),
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantReadWriteData(fn);
    if (s3Access) mediaBucket.grantReadWrite(fn);

    const integration = new apigateway.LambdaIntegration(fn);
    const collection  = api.root.addResource(pathSegment);
    collection.addMethod('GET',  integration, auth);
    collection.addMethod('POST', integration, auth);

    const item = collection.addResource('{id}');
    item.addMethod('GET',    integration, auth);
    item.addMethod('PUT',    integration, auth);
    item.addMethod('DELETE', integration, auth);
  }
}
