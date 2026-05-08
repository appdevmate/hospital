import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

const CORS = {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

export interface ClinifyClinicStackProps extends cdk.StackProps {
    userPool: cognito.UserPool;
}

export class ClinifyClinicStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ClinifyClinicStackProps) {
        super(scope, id, props);

        // ── DynamoDB Tables ───────────────────────────────────────────────────

        const doctorsTable = new dynamodb.Table(this, 'DoctorsTable', {
            tableName: 'Doctors',
            partitionKey: { name: 'doctorId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const departmentsTable = new dynamodb.Table(this, 'DepartmentsTable', {
            tableName: 'Departments',
            partitionKey: { name: 'departmentId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const specializationsTable = new dynamodb.Table(this, 'SpecializationsTable', {
            tableName: 'Specializations',
            partitionKey: { name: 'specializationId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const paymentsTable = new dynamodb.Table(this, 'PaymentsTable', {
            tableName: 'Payments',
            partitionKey: { name: 'paymentId',  type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'patientId',  type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        paymentsTable.addGlobalSecondaryIndex({
            indexName: 'by-patient-index',
            partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'paymentId', type: dynamodb.AttributeType.STRING },
        });

        const examinationsTable = new dynamodb.Table(this, 'ExaminationsTable', {
            tableName: 'Examinations',
            partitionKey: { name: 'examId',    type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'patientId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        examinationsTable.addGlobalSecondaryIndex({
            indexName: 'by-patient-index',
            partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'examId',    type: dynamodb.AttributeType.STRING },
        });

        const calendarsTable = new dynamodb.Table(this, 'CalendarsTable', {
            tableName: 'Calendars',
            partitionKey: { name: 'calendarId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const eventsTable = new dynamodb.Table(this, 'CalendarEventsTable', {
            tableName: 'CalendarEvents',
            partitionKey: { name: 'eventId',    type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'calendarId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        eventsTable.addGlobalSecondaryIndex({
            indexName: 'by-calendar-index',
            partitionKey: { name: 'calendarId', type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'eventId',    type: dynamodb.AttributeType.STRING },
        });

        const legacyAppointmentsTable = new dynamodb.Table(this, 'LegacyAppointmentsTable', {
            tableName: 'LegacyAppointments',
            partitionKey: { name: 'appointmentId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        legacyAppointmentsTable.addGlobalSecondaryIndex({
            indexName: 'by-doctor-index',
            partitionKey: { name: 'doctorEmail', type: dynamodb.AttributeType.STRING },
            sortKey:      { name: 'date',         type: dynamodb.AttributeType.STRING },
        });

        // ── Lambda factory ────────────────────────────────────────────────────
        const makeFn = (
            id: string,
            name: string,
            entry: string,
            env: Record<string, string>,
            tables: dynamodb.Table[],
        ): lambdaNodejs.NodejsFunction => {
            const fn = new lambdaNodejs.NodejsFunction(this, id, {
                functionName: name,
                runtime: lambda.Runtime.NODEJS_20_X,
                entry: path.join(__dirname, `../lambda/${entry}`),
                handler: 'handler',
                timeout: cdk.Duration.seconds(15),
                memorySize: 256,
                environment: { ...env, NODE_OPTIONS: '--enable-source-maps' },
                bundling: { minify: true, sourceMap: true, externalModules: ['@aws-sdk/*'] },
                logGroup: new logs.LogGroup(this, `${id}Logs`, {
                    logGroupName: `/aws/lambda/${name}`,
                    retention: logs.RetentionDays.ONE_MONTH,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            });
            tables.forEach((t) => t.grantReadWriteData(fn));
            return fn;
        };

        // ── Lambda Functions ──────────────────────────────────────────────────
        const doctorsFn = makeFn('DoctorsFn', 'clinify-doctors', 'doctors.ts', {
            DOCTORS_TABLE:         doctorsTable.tableName,
            DEPARTMENTS_TABLE:     departmentsTable.tableName,
            SPECIALIZATIONS_TABLE: specializationsTable.tableName,
        }, [doctorsTable, departmentsTable, specializationsTable]);

        const paymentsFn = makeFn('PaymentsFn', 'clinify-payments', 'payments.ts', {
            PAYMENTS_TABLE: paymentsTable.tableName,
        }, [paymentsTable]);

        const examinationsFn = makeFn('ExaminationsFn', 'clinify-examinations', 'examinations.ts', {
            EXAMINATIONS_TABLE: examinationsTable.tableName,
        }, [examinationsTable]);

        const calendarFn = makeFn('CalendarFn', 'clinify-calendar', 'calendar.ts', {
            CALENDARS_TABLE:     calendarsTable.tableName,
            EVENTS_TABLE:        eventsTable.tableName,
            APPOINTMENTS_TABLE:  legacyAppointmentsTable.tableName,
        }, [calendarsTable, eventsTable, legacyAppointmentsTable]);

        // ── API Gateway ───────────────────────────────────────────────────────
        const api = new apigateway.RestApi(this, 'ClinicApi', {
            restApiName: 'clinify-clinic-api',
            description: 'Clinify Clinic — Doctors, Payments, Examinations, Calendar',
            deployOptions: {
                stageName: 'prod',
                throttlingBurstLimit: 100,
                throttlingRateLimit: 200,
            },
            defaultCorsPreflightOptions: CORS,
        });

        // ── Cognito authorizer ────────────────────────────────────────────────
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ClinicAuthorizer', {
            cognitoUserPools: [props.userPool],
            authorizerName: 'clinify-clinic-authorizer',
            identitySource: 'method.request.header.Authorization',
        });

        const auth: apigateway.MethodOptions = {
            authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        };

        const dInt = new apigateway.LambdaIntegration(doctorsFn);
        const pInt = new apigateway.LambdaIntegration(paymentsFn);
        const eInt = new apigateway.LambdaIntegration(examinationsFn);
        const cInt = new apigateway.LambdaIntegration(calendarFn);

        // ── Doctors routes ────────────────────────────────────────────────────
        const doctors = api.root.addResource('doctors');
        doctors.addMethod('GET',  dInt, auth);
        doctors.addMethod('POST', dInt, auth);

        doctors.addResource('email').addMethod('POST', dInt, auth);

        const doctorsFilterField = doctors.addResource('filter-options').addResource('{field}');
        doctorsFilterField.addMethod('GET', dInt, auth);

        const doctorId = doctors.addResource('{id}');
        doctorId.addMethod('GET',    dInt, auth);
        doctorId.addMethod('PATCH',  dInt, auth);
        doctorId.addMethod('DELETE', dInt, auth);

        // ── Departments routes ────────────────────────────────────────────────
        const departments = api.root.addResource('departments');
        departments.addMethod('GET',  dInt, auth);
        departments.addMethod('POST', dInt, auth);
        departments.addResource('bulk').addMethod('POST', dInt, auth);

        // ── Specializations routes ────────────────────────────────────────────
        const specializations = api.root.addResource('specializations');
        specializations.addMethod('GET',  dInt, auth);
        specializations.addMethod('POST', dInt, auth);
        specializations.addResource('bulk').addMethod('POST', dInt, auth);

        // ── Invoices route ────────────────────────────────────────────────────
        api.root.addResource('invoices').addMethod('GET', pInt, auth);

        // ── Patient payments routes ───────────────────────────────────────────
        const payments = api.root.addResource('patients').addResource('{patientId}').addResource('payments');
        payments.addMethod('GET',  pInt, auth);
        payments.addMethod('POST', pInt, auth);

        const paymentId = payments.addResource('{paymentId}');
        paymentId.addMethod('PATCH',  pInt, auth);
        paymentId.addMethod('DELETE', pInt, auth);

        // ── Examinations routes ───────────────────────────────────────────────
        const examinations = api.root.addResource('examinations');
        examinations.addMethod('GET',  eInt, auth);
        examinations.addMethod('POST', eInt, auth);

        const examId = examinations.addResource('{examId}');
        examId.addMethod('GET',    eInt, auth);
        examId.addMethod('PATCH',  eInt, auth);
        examId.addMethod('DELETE', eInt, auth);
        examId.addResource('signoff').addMethod('POST', eInt, auth);

        // ── Calendar routes ───────────────────────────────────────────────────
        const calendars = api.root.addResource('calendars');
        calendars.addMethod('GET',  cInt, auth);
        calendars.addMethod('POST', cInt, auth);

        const calendarId = calendars.addResource('{calendarId}');
        calendarId.addMethod('DELETE', cInt, auth);

        const events = calendarId.addResource('events');
        events.addMethod('GET',  cInt, auth);
        events.addMethod('POST', cInt, auth);

        const eventId = events.addResource('{eventId}');
        eventId.addMethod('PATCH',  cInt, auth);
        eventId.addMethod('DELETE', cInt, auth);

        // ── Legacy Appointments routes ────────────────────────────────────────
        const appts = api.root.addResource('appointments');
        appts.addMethod('GET',  cInt, auth);
        appts.addMethod('POST', cInt, auth);

        const apptId = appts.addResource('{appointmentId}');
        apptId.addMethod('PATCH',  cInt, auth);
        apptId.addMethod('DELETE', cInt, auth);

        // ── Outputs ───────────────────────────────────────────────────────────
        new cdk.CfnOutput(this, 'ClinicApiUrl', {
            value: api.url.replace(/\/$/, ''),
            description: 'Clinic API base URL (without trailing slash)',
            exportName: 'ClinifyClinicApiUrl',
        });
    }
}
