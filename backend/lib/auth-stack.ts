import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';

export class ClinifyAuthStack extends cdk.Stack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ── User Pool ─────────────────────────────────────────────────────────
        this.userPool = new cognito.UserPool(this, 'ClinifyUserPool', {
            userPoolName: 'clinify-hospital-users',
            selfSignUpEnabled: false,           // Admins create users only
            signInAliases: { email: true },
            autoVerify: { email: true },
            standardAttributes: {
                email:       { required: true, mutable: true },
                fullname:    { required: false, mutable: true },
                phoneNumber: { required: false, mutable: true },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        // ── Groups (match what AuthService.parseRole expects) ─────────────────
        for (const g of ['Developers', 'Admin', 'Doctors', 'Patients']) {
            new cognito.CfnUserPoolGroup(this, `${g}Group`, {
                userPoolId: this.userPool.userPoolId,
                groupName: g,
                description: `${g} group`,
            });
        }

        // ── Hosted UI domain ──────────────────────────────────────────────────
        const domain = this.userPool.addDomain('ClinifyDomain', {
            cognitoDomain: {
                // Must be globally unique — embed account id to guarantee that
                domainPrefix: `clinify-hospital-${this.account}`,
            },
        });

        // ── App Client (PKCE, no secret — required for Angular SPA) ──────────
        this.userPoolClient = this.userPool.addClient('ClinifyAngularClient', {
            userPoolClientName: 'clinify-angular-app',
            generateSecret: false,
            authFlows: { userSrp: true },
            oAuth: {
                flows: { authorizationCodeGrant: true },
                scopes: [
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PHONE,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    'http://localhost:4200/',
                    'http://localhost:4200',
                ],
                logoutUrls: [
                    'http://localhost:4200/',
                    'http://localhost:4200',
                ],
            },
            supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
            accessTokenValidity:  Duration.hours(8),
            idTokenValidity:      Duration.hours(8),
            refreshTokenValidity: Duration.days(30),
            preventUserExistenceErrors: true,
        });

        // ── Outputs ───────────────────────────────────────────────────────────
        new CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            exportName: 'ClinifyUserPoolId',
        });
        new CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            exportName: 'ClinifyUserPoolClientId',
        });
        new CfnOutput(this, 'CognitoAuthority', {
            value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
            exportName: 'ClinifyAuthority',
        });
        new CfnOutput(this, 'CognitoLoginUrl', {
            value: `https://clinify-hospital-${this.account}.auth.${this.region}.amazoncognito.com/login`,
            description: 'Hosted UI login endpoint',
        });
    }
}
