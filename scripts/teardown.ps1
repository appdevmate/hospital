# =============================================================================
# Akwadona -- Full teardown script (T.1).
#
# What this script does:
#   1. Empties the S3 buckets (CDK refuses to delete non-empty buckets).
#   2. Runs `npx cdk destroy --force` -- removes Lambdas, API Gateway,
#      CloudFront, Cognito user pool + groups + domain, IAM roles, log groups,
#      custom resources.
#   3. Schedules per-tenant KMS key deletion (7-day wait -- AWS minimum) so
#      the monthly KMS bill ($1/key/month) stops accruing.
#   4. Deletes the `Hospital` DynamoDB table (CDK retains it by default).
#   5. Prints what remains (ACM cert is free; Route 53 zone if applicable
#      ~ $0.50/month).
#
# After teardown the AWS bill is essentially $0 -- except the Route 53 hosted
# zone if you keep DNS active so the brand domain stays reachable.
#
# Safety: this script DESTROYS DATA. Run with -ConfirmDestroyData:
#
#     .\scripts\teardown.ps1 -ConfirmDestroyData
#
# Recovery: run `.\scripts\recover.ps1` to rebuild everything from CDK. The
# DynamoDB rows you had are gone forever; KMS keys can be un-deleted only
# inside the 7-day pending-deletion window.
# =============================================================================

param(
    [switch]$ConfirmDestroyData
)

$ErrorActionPreference = 'Continue'

# --- Hardcoded resource IDs (from CDK outputs) -------------------------------
$STACK_NAME       = 'TiryaqCdkStack'
$FRONTEND_BUCKET  = 'tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub'
$DOCUMENTS_BUCKET = 'tiryaq-documents-483176634665-us-east-1'
$DDB_TABLE        = 'Hospital'

# Per-tenant KMS keys (from earlier deployment). Two tenants only today.
$KMS_KEYS = @(
    'arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6',  # Tiryaq data
    'arn:aws:kms:us-east-1:483176634665:key/c1c1657b-b3f9-41a9-a816-dee382e00bb1',  # Alshifaa data
    'arn:aws:kms:us-east-1:483176634665:key/601f8aab-f37c-4786-a557-afc12cb864e8',  # Tiryaq HMAC
    'arn:aws:kms:us-east-1:483176634665:key/0a23ea33-4659-4f37-a4a2-a62366010bcd'   # Alshifaa HMAC
)

# --- Safety gate -------------------------------------------------------------
if (-not $ConfirmDestroyData) {
    Write-Host ""
    Write-Host "REFUSING TO RUN." -ForegroundColor Red
    Write-Host "This script destroys all Akwadona data + infrastructure." -ForegroundColor Yellow
    Write-Host "Re-run with the explicit flag:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    .\scripts\teardown.ps1 -ConfirmDestroyData" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "=== Akwadona teardown ===" -ForegroundColor Cyan
Write-Host "Starting at $(Get-Date -Format 'HH:mm:ss')."

# --- Step 1: Empty S3 buckets -----------------------------------------------
Write-Host ""
Write-Host "--- Step 1: Emptying S3 buckets ---" -ForegroundColor Cyan
foreach ($b in @($FRONTEND_BUCKET, $DOCUMENTS_BUCKET)) {
    Write-Host "Emptying s3://$b ..."
    aws s3 rm "s3://$b" --recursive --quiet 2>$null
    # Also remove any versioned object markers (if versioning ever enabled)
    $versions = aws s3api list-object-versions --bucket $b --query "Versions[].{Key:Key,VersionId:VersionId}" --output json 2>$null
    if ($versions -and $versions -ne '[]') {
        try {
            $vs = $versions | ConvertFrom-Json
            foreach ($v in $vs) {
                aws s3api delete-object --bucket $b --key $v.Key --version-id $v.VersionId 2>$null | Out-Null
            }
        } catch { }
    }
}

# --- Step 2: CDK destroy -----------------------------------------------------
Write-Host ""
Write-Host "--- Step 2: CDK destroy (Lambdas, API GW, CloudFront, Cognito, IAM) ---" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\tiryaq-cdk"
npx cdk destroy --force
Pop-Location

# --- Step 3: Schedule KMS key deletion --------------------------------------
Write-Host ""
Write-Host "--- Step 3: Scheduling per-tenant KMS key deletion (7-day window) ---" -ForegroundColor Cyan
foreach ($k in $KMS_KEYS) {
    Write-Host "Scheduling deletion: $k"
    aws kms schedule-key-deletion --key-id $k --pending-window-in-days 7 --output text 2>$null
}

# --- Step 4: Delete DynamoDB table ------------------------------------------
Write-Host ""
Write-Host "--- Step 4: Deleting DynamoDB table '$DDB_TABLE' ---" -ForegroundColor Cyan
aws dynamodb delete-table --table-name $DDB_TABLE --output text 2>$null

# --- Step 5: Summary --------------------------------------------------------
Write-Host ""
Write-Host "=== Teardown complete ===" -ForegroundColor Green
Write-Host "Finished at $(Get-Date -Format 'HH:mm:ss')."
Write-Host ""
Write-Host "What's gone (no bill):" -ForegroundColor Green
Write-Host "  - All Lambdas, API Gateway, CloudFront, Cognito"
Write-Host "  - S3 buckets (after CDK destroy)"
Write-Host "  - DynamoDB table 'Hospital'"
Write-Host "  - IAM roles + policies + log groups"
Write-Host ""
Write-Host "What's pending (charge stops after deletion):" -ForegroundColor Yellow
Write-Host "  - 4 KMS keys -- scheduled for deletion in 7 days. Cancel inside"
Write-Host "    the window with: aws kms cancel-key-deletion --key-id <ARN>"
Write-Host ""
Write-Host "What remains (small / free):" -ForegroundColor Cyan
Write-Host "  - ACM certificate for auth.akwadona.com -- free."
Write-Host "  - Route 53 hosted zone (if any) -- ~ `$0.50/month."
Write-Host "  - GoDaddy domain renewal (not AWS)."
Write-Host ""
Write-Host "To rebuild: .\scripts\recover.ps1" -ForegroundColor Cyan
