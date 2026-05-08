import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface UsersStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
}

export class UsersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: UsersStackProps) {
    super(scope, id, props);

    // ── DynamoDB ──────────────────────────────────────────────────────────────
    const table = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'Users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── Lambda ────────────────────────────────────────────────────────────────
    const usersFunction = new lambdaNodejs.NodejsFunction(this, 'UsersFunction', {
      functionName: 'clinify-users',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/users.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
      logGroup: new logs.LogGroup(this, 'UsersFunctionLogs', {
        logGroupName: `/aws/lambda/clinify-users`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    table.grantReadWriteData(usersFunction);

    // ── API Gateway ───────────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'UsersApi', {
      restApiName: 'clinify-users-api',
      description: 'Clinify Users CRUD',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 50,
        throttlingRateLimit: 100,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
    });

    // ── Cognito authorizer ────────────────────────────────────────────────────
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'UsersAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'clinify-users-authorizer',
      identitySource: 'method.request.header.Authorization',
    });

    const auth: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    const integration = new apigateway.LambdaIntegration(usersFunction);

    const usersResource = api.root.addResource('users');
    usersResource.addMethod('GET',  integration, auth);
    usersResource.addMethod('POST', integration, auth);

    const userResource = usersResource.addResource('{userId}');
    userResource.addMethod('GET',    integration, auth);
    userResource.addMethod('PUT',    integration, auth);
    userResource.addMethod('DELETE', integration, auth);

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `${api.url}users`,
      description: 'Users API base URL',
      exportName: 'ClinifyUsersApiUrl',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      value: usersFunction.functionArn,
      description: 'Lambda function ARN',
    });
  }
}
