# =============================================================================
# Akwadona -- Full recover script (T.2). The opposite of teardown.ps1.
#
# What this script does:
#   1. Cancels any pending KMS key deletions (only works inside the 7-day
#      pending-deletion window left by teardown.ps1).
#   2. Runs `npx cdk deploy --require-approval never` -- recreates Lambdas,
#      API Gateway, CloudFront, Cognito, IAM, log groups, custom resources.
#   3. Runs the tenant-seed script so the operator console shows tenants.
#   4. Prints the resulting URLs + IDs.
#
# Recovery scope:
#   - If your KMS keys are inside the 7-day window  ==> data CAN be recovered
#     (the DynamoDB rows are gone but the keys are usable for any backup you
#     restore separately).
#   - If your KMS keys were destroyed (window passed) ==> a fresh stack with
#     NEW keys is created. Old encrypted data (if any backup exists) is
#     mathematically unreadable. This matches GDPR "right to be forgotten".
#
# Usage:
#
#     .\scripts\recover.ps1
# =============================================================================

$ErrorActionPreference = 'Continue'

# --- Hardcoded resource IDs (same as teardown.ps1) ---------------------------
$KMS_KEYS = @(
    'arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6',  # Tiryaq data
    'arn:aws:kms:us-east-1:483176634665:key/c1c1657b-b3f9-41a9-a816-dee382e00bb1',  # Alshifaa data
    'arn:aws:kms:us-east-1:483176634665:key/601f8aab-f37c-4786-a557-afc12cb864e8',  # Tiryaq HMAC
    'arn:aws:kms:us-east-1:483176634665:key/0a23ea33-4659-4f37-a4a2-a62366010bcd'   # Alshifaa HMAC
)

Write-Host "=== Akwadona recover ===" -ForegroundColor Cyan
Write-Host "Starting at $(Get-Date -Format 'HH:mm:ss')."

# --- Step 1: Cancel pending KMS key deletions -------------------------------
Write-Host ""
Write-Host "--- Step 1: Cancel any pending KMS key deletions ---" -ForegroundColor Cyan
foreach ($k in $KMS_KEYS) {
    $status = aws kms describe-key --key-id $k --query "KeyMetadata.KeyState" --output text 2>$null
    if ($status -eq 'PendingDeletion') {
        Write-Host "Cancelling deletion for: $k"
        aws kms cancel-key-deletion --key-id $k --output text 2>$null
        # KMS key is now Disabled after cancel — re-enable it
        aws kms enable-key --key-id $k 2>$null
        Write-Host "  Re-enabled."
    } elseif ($status -eq 'Enabled' -or $status -eq 'Disabled') {
        Write-Host "Already exists (state=$status): $k"
        if ($status -eq 'Disabled') { aws kms enable-key --key-id $k 2>$null }
    } else {
        Write-Host "Key not found or destroyed: $k" -ForegroundColor Yellow
        Write-Host "  CDK will create a NEW key. Update tenantKeys[] and tenantHmacKeys[] maps." -ForegroundColor Yellow
    }
}

# --- Step 2: CDK deploy -----------------------------------------------------
Write-Host ""
Write-Host "--- Step 2: CDK deploy (recreate everything) ---" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\tiryaq-cdk"
npx cdk deploy --require-approval never
Pop-Location

# --- Step 3: Seed tenant profile rows ---------------------------------------
Write-Host ""
Write-Host "--- Step 3: Seed tenant profile rows ---" -ForegroundColor Cyan
if (Test-Path "$PSScriptRoot\seed-tenants.ps1") {
    & "$PSScriptRoot\seed-tenants.ps1"
} else {
    Write-Host "scripts\seed-tenants.ps1 not found -- skipped." -ForegroundColor Yellow
}

# --- Step 4: Frontend deploy hint -------------------------------------------
Write-Host ""
Write-Host "--- Step 4: Frontend deploy (manual) ---" -ForegroundColor Cyan
Write-Host "Now run these to rebuild + ship the Angular app:"
Write-Host ""
Write-Host "  cd `"$PSScriptRoot\..`"" -ForegroundColor Gray
Write-Host "  npm run build" -ForegroundColor Gray
Write-Host "  aws s3 sync dist/verona-ng/browser s3://tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub --delete" -ForegroundColor Gray
Write-Host "  aws cloudfront create-invalidation --distribution-id E1Z1ZKYM74LVA7 --paths `"/*`"" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Recover complete ===" -ForegroundColor Green
Write-Host "Finished at $(Get-Date -Format 'HH:mm:ss')."
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run the frontend deploy commands above."
Write-Host "  2. Re-add operator user to the 'Operator' Cognito group:"
Write-Host "       AWS Console -> Cognito -> User Pool -> Groups -> Operator -> Add users -> sami@akwadona.com"
Write-Host "  3. Sign in at https://www.akwadona.com/operator to verify."
