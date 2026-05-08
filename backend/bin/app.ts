#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { UsersStack }          from '../lib/users-stack';
import { HmsStack }            from '../lib/hms-stack';
import { ClinifyAuthStack }    from '../lib/auth-stack';
import { ClinifyClinicStack }  from '../lib/clinic-stack';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' };

// Auth must be deployed first — other stacks reference its UserPool
const authStack = new ClinifyAuthStack(app, 'ClinifyAuthStack', {
    env,
    description: 'Clinify Auth — Cognito User Pool, Groups, and Hosted UI',
});

new UsersStack(app, 'ClinifyUsersStack', {
    env,
    userPool: authStack.userPool,
    description: 'Clinify Users API — DynamoDB + Lambda + API Gateway',
});

new HmsStack(app, 'ClinifyHmsStack', {
    env,
    userPool: authStack.userPool,
    description: 'Clinify HMS — Patient Management (DynamoDB + Lambda + API Gateway + S3)',
});

new ClinifyClinicStack(app, 'ClinifyClinicStack', {
    env,
    userPool: authStack.userPool,
    description: 'Clinify Clinic — Doctors, Payments, Examinations, Calendar (DynamoDB + Lambda + API Gateway)',
});
