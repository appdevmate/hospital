# Tiryaq Hospital Platform — AWS Deployment Guide

This guide covers how to deploy the entire Tiryaq platform to a fresh AWS account
using the CDK stack. Follow these steps in order every time you need to deploy
to a new account.

---

## Prerequisites (one-time setup on your machine)

```powershell
npm install -g aws-cdk
```

---

## Step 1 — Create IAM credentials on the new AWS account

1. Log in to the **new** AWS account console
2. Go to **IAM → Users → Create User**
3. Attach policy: `AdministratorAccess`
4. Go to the user → **Security credentials → Create access key**
5. Copy the **Access Key ID** and **Secret Access Key**

---

## Step 2 — Configure AWS CLI with the new account

```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID:     <paste Access Key ID>
AWS Secret Access Key: <paste Secret Access Key>
Default region name:   us-east-1
Default output format: json
```

Verify it's working:
```powershell
aws sts get-caller-identity
```

You should see the new account ID in the output.

---

## Step 3 — Create a Cognito User Pool on the new account

The stack imports Cognito — you need to create it manually once on the new account,
then update the stack with the new IDs.

1. Go to **Cognito → Create user pool** in the new account
2. Configure it the same as your existing pool (app client, hosted UI, etc.)
3. Note down:
   - **User Pool ID** (e.g. `us-east-1_XXXXXXXX`)
   - **App Client ID** (e.g. `xxxxxxxxxxxxxxxxxx`)

4. Open `lib/tiryaq-stack.ts` and replace these two values:

```typescript
// Line: Cognito import
const userPool = cognito.UserPool.fromUserPoolId(this, 'TiryaqUserPool', 'NEW_USER_POOL_ID');

// Line: shared env
const sharedEnv = {
    TABLE_NAME: 'Hospital',
    USER_POOL_ID: 'NEW_USER_POOL_ID'
};

// Line: JWT authorizer
const authorizer = new HttpJwtAuthorizer(
    'TiryaqAuthorizer',
    'https://cognito-idp.us-east-1.amazonaws.com/NEW_USER_POOL_ID',
    {
        jwtAudience: ['NEW_APP_CLIENT_ID'],
        ...
    }
);
```

---

## Step 4 — Bootstrap CDK on the new account

This is a one-time command per account. It creates the CDK staging bucket.

```powershell
# Replace 123456789012 with the new account ID from Step 2
cdk bootstrap aws://123456789012/us-east-1
```

---

## Step 5 — Preview what will be deployed

```powershell
cdk diff
```

Review the output. Everything should show `[+]` (creates only).
Nothing should be modified or deleted.

---

## Step 6 — Deploy to AWS

```powershell
cdk deploy
```

- Type `y` when asked to confirm IAM changes
- Wait 5–10 minutes
- At the end you will see the outputs:

```
Outputs:
TiryaqStack.ApiUrl        = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
TiryaqStack.CloudFrontUrl = https://xxxxxxxxxxxx.cloudfront.net
TiryaqStack.S3BucketName  = tiryaq-bucket-xxxx
TiryaqStack.UserPoolId    = us-east-1_XXXXXXXX
```

**Save these values** — you will need them in the next steps.

---

## Step 7 — Update Angular environment with the new API URL

Open your Angular project and update the API URL:

File: `src/environments/environment.ts`
```typescript
export const environment = {
    production: false,
    apiUrl: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com'  // from Step 6
};
```

File: `src/environments/environment.prod.ts`
```typescript
export const environment = {
    production: true,
    apiUrl: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com'  // from Step 6
};
```

Also update the Cognito config in your app (wherever you have the User Pool ID
and App Client ID configured — usually `app.config.ts` or `auth.config.ts`).

---

## Step 8 — Build the Angular app

```powershell
# Run from the hospital (Angular) folder
cd "C:\Users\staha\Desktop\CCC APPS\My Apps\hospital"
ng build --configuration production
```

---

## Step 9 — Upload Angular build to S3

```powershell
# Replace tiryaq-bucket-xxxx with the bucket name from Step 6
aws s3 sync dist/tiryaq/browser/ s3://tiryaq-bucket-xxxx --delete
```

---

## Step 10 — Invalidate CloudFront cache

```powershell
# Replace DISTRIBUTION_ID with the CloudFront ID from your AWS console
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

---

## Step 11 — Create an Admin user in Cognito

1. Go to **Cognito → User pools → your new pool → Users → Create user**
2. Create the first admin user
3. Go to **Groups → Create group** named `Admin`
4. Add the user to the `Admin` group

---

## Done ✅

Your Tiryaq platform is now live on the new account.
Visit the **CloudFrontUrl** from Step 6 to access the app.

---

## Quick Reference — Commands Summary

```powershell
# 1. Configure new account
aws configure
aws sts get-caller-identity

# 2. Bootstrap CDK (one time per account)
cdk bootstrap aws://ACCOUNT_ID/us-east-1

# 3. Preview changes
cdk diff

# 4. Deploy infrastructure
cdk deploy

# 5. Build Angular
ng build --configuration production

# 6. Upload to S3
aws s3 sync dist/tiryaq/browser/ s3://BUCKET_NAME --delete

# 7. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

---

## Future Updates (after initial deploy)

When you update a Lambda function locally, just run:
```powershell
cdk deploy
```
CDK will only update the functions that changed. Everything else stays untouched.

When you update the Angular app:
```powershell
ng build --configuration production
aws s3 sync dist/tiryaq/browser/ s3://BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```