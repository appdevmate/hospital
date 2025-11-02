
# Cross-Account DynamoDB Table Import Guide

This document explains how to export a DynamoDB table from one AWS account (source) and import it into another AWS account (target) using **S3 Export + DynamoDB Import from S3**.

---

## 1. Export DynamoDB Table from Source Account

1. Sign in to the **source account** where the DynamoDB table exists.
2. Open **DynamoDB → Tables → [YourTable] → Exports and streams**.
3. Click **Export to S3**:
   - Choose an **S3 bucket** (e.g. `hospital-s3-export-db`).
   - DynamoDB creates a folder prefix automatically: `AWSDynamoDB/<export-id>/`.
4. Wait for the export job to complete.

**Result:** Table data is stored in JSON format inside the S3 bucket.

---

## 2. Create Import Role in Target Account

In the **target account**, create a role that DynamoDB can assume to read from the S3 bucket.

### Trust Policy
When creating the role in IAM, select **Custom trust policy** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "dynamodb.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Permission Policy
Attach this inline policy (edit bucket name/prefix as needed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::hospital-s3-export-db",
      "Condition": { "StringLike": { "s3:prefix": ["AWSDynamoDB/*"] } }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject","s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::hospital-s3-export-db/AWSDynamoDB/*"
    }
  ]
}
```

If S3 export objects use **SSE-KMS encryption**, add:

```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt","kms:DescribeKey"],
  "Resource": "arn:aws:kms:<REGION>:<SOURCE_ACCOUNT_ID>:key/<KEY_ID>"
}
```

Name this role, for example: `DynamoDBImportRole`.

---

## 3. Update Source S3 Bucket Policy

In the **source account**, update the S3 bucket policy to allow the target role ARN.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowTargetRoleList",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<TARGET_ACCOUNT_ID>:role/DynamoDBImportRole" },
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::hospital-s3-export-db",
      "Condition": { "StringLike": { "s3:prefix": ["AWSDynamoDB/*"] } }
    },
    {
      "Sid": "AllowTargetRoleRead",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<TARGET_ACCOUNT_ID>:role/DynamoDBImportRole" },
      "Action": ["s3:GetObject","s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::hospital-s3-export-db/AWSDynamoDB/*"
    }
  ]
}
```

If encryption = **SSE-KMS**, update the **KMS key policy** too:

```json
{
  "Sid": "AllowTargetRoleDecrypt",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::<TARGET_ACCOUNT_ID>:role/DynamoDBImportRole" },
  "Action": ["kms:Decrypt","kms:DescribeKey"],
  "Resource": "*"
}
```

---

## 4. Create Target DynamoDB Table

In the **target account**:
- Go to **DynamoDB → Tables → Create table**.
- Match the **partition key** and **sort key** (if any) from the source table.
- Create GSIs/LSIs if needed.

---

## 5. Start the Import Job

1. In the **target account**, open **DynamoDB → Imports from S3**.
2. Click **Import table**.
3. Enter details:
   - **S3 URI**: `s3://hospital-s3-export-db/AWSDynamoDB/<export-id>/`
   - **Import role**: select `DynamoDBImportRole`
   - **Target table name**: choose the table you created
4. Start the job.

---

## 6. Monitor and Verify

- Check **Imports from S3** for status.
- After success, open the target table → **Items** tab to confirm records.

---

## 7. Troubleshooting

- **403 AccessDenied** → bucket policy or KMS key policy missing the role ARN.  
- **Invalid principal in policy** → the role ARN is wrong or role not created yet.  
- **Region mismatch** → ensure S3 bucket and import job are in the same region.  
- **Schema mismatch** → target table’s partition/sort key must match the source.

---

## 8. CLI Validation

After policies are in place, verify access with the **target profile**:

```bash
aws s3 ls s3://hospital-s3-export-db/AWSDynamoDB/ --profile target
aws s3 cp s3://hospital-s3-export-db/AWSDynamoDB/manifest.json . --profile target
```

If these succeed, the role can access S3 and the import will work.
