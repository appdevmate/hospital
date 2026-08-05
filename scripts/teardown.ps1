# =============================================================================
# Akwadona -- Full teardown script (T.1).
#
# What this script does (in order):
#   1. EMPTIES all non-audit akwadona-* S3 buckets in bulk (versions + delete
#      markers, batched via delete-objects). Prevents cdk destroy from
#      leaving retained non-empty buckets.
#   2. Deletes the Cognito user pool + any custom domain (retained by default).
#   3. Disables DynamoDB deletion protection on `Hospital` and deletes it.
#   4. Runs `npx cdk destroy AkwadonaCdkStack --force`.
#   5. Post-destroy cleanup for anything CDK's RETAIN policy left behind:
#      - Deletes leftover non-audit S3 buckets.
#      - Schedules ALL Akwadona-related KMS keys for 7-day deletion — both
#        stack-level (data + audit CMKs from RETAIN) and per-tenant CMKs
#        created by the wizard (discovered via akwadona:tenantId tag).
#      - Deletes stray KMS aliases pointing at pending-deletion keys.
#      - Deletes orphan Lambda + akwadona CloudWatch log groups.
#
# What is intentionally NOT destroyed (must stay):
#   - Audit bucket(s) `akwadona-audit-*` — COMPLIANCE Object Lock with
#     ~7-year retention. The CDK stack always creates a fresh audit bucket
#     with a version suffix (v2, v3, ...) on redeploy — older ones remain
#     until their retention window expires (~2033 for the earliest).
#   - ACM certificates (free; survive for next deploy).
#   - Route 53 hosted zone (if any).
#   - GoDaddy domain.
#
# Safety: this script DESTROYS DATA. Run with -ConfirmDestroyData:
#
#     .\scripts\teardown.ps1 -ConfirmDestroyData
#
# Recovery: run `.\scripts\recover.ps1` to rebuild the stack from CDK.
# =============================================================================

param(
    [switch]$ConfirmDestroyData
)

$ErrorActionPreference = 'Continue'

# --- Configuration -----------------------------------------------------------
$STACK_NAME     = 'AkwadonaCdkStack'
$DDB_TABLE      = 'Hospital'
$USER_POOL_NAME = 'akwadona-user-pool'
$CDK_FOLDER     = "$PSScriptRoot\..\akwadona-cdk"
$TMP_DEL_JSON   = "$env:TEMP\akw-del.json"

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

# --- Helper: empty a bucket by batch-deleting all versions + delete markers ---
function Empty-Bucket {
    param([string]$Bucket, [switch]$BypassGovernance)
    Write-Host "  Emptying $Bucket ..."
    $safety = 0
    do {
        $page = aws s3api list-object-versions --bucket $Bucket --max-keys 1000 --output json 2>$null | ConvertFrom-Json
        $items = @()
        if ($page.Versions)      { $items += $page.Versions      | ForEach-Object { @{Key=$_.Key; VersionId=$_.VersionId} } }
        if ($page.DeleteMarkers) { $items += $page.DeleteMarkers | ForEach-Object { @{Key=$_.Key; VersionId=$_.VersionId} } }
        if ($items.Count -eq 0) { break }
        $payload = @{Objects=$items; Quiet=$true} | ConvertTo-Json -Depth 5 -Compress
        $payload | Out-File -Encoding ascii -FilePath $TMP_DEL_JSON
        if ($BypassGovernance) {
            aws s3api delete-objects --bucket $Bucket --delete "file://$TMP_DEL_JSON" --bypass-governance-retention 2>$null | Out-Null
        } else {
            aws s3api delete-objects --bucket $Bucket --delete "file://$TMP_DEL_JSON" 2>$null | Out-Null
        }
        Write-Host "    drained $($items.Count)"
        $safety++
    } while ($items.Count -ge 1000 -and $safety -lt 200)
}

# --- Step 1: Empty non-audit akwadona-* S3 buckets ---------------------------
Write-Host ""
Write-Host "--- Step 1: Empty non-audit akwadona-* S3 buckets ---" -ForegroundColor Cyan
$buckets = aws s3api list-buckets --query "Buckets[?starts_with(Name,'akwadona') || starts_with(Name,'akwadonacdkstack')].Name" --output json | ConvertFrom-Json
foreach ($b in $buckets) {
    if ($b -like 'akwadona-audit*') {
        Write-Host "  SKIP $b (Object Lock — retained until ~2033)" -ForegroundColor Yellow
        continue
    }
    Empty-Bucket -Bucket $b
}

# --- Step 2: Delete Cognito user pool + custom domain ------------------------
Write-Host ""
Write-Host "--- Step 2: Delete Cognito user pool + custom domain ---" -ForegroundColor Cyan
$pools = aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='$USER_POOL_NAME']" --output json | ConvertFrom-Json
foreach ($p in $pools) {
    # (a) Detach custom domain and WAIT until it is really gone -- the pool
    #     cannot be deleted while a domain is attached.
    $cd = aws cognito-idp describe-user-pool --user-pool-id $p.Id --query "UserPool.CustomDomain" --output text 2>$null
    if ($cd -and $cd -ne 'None' -and $cd -ne '') {
        Write-Host "  Detach custom domain $cd"
        aws cognito-idp delete-user-pool-domain --user-pool-id $p.Id --domain $cd 2>$null
        for ($i = 0; $i -lt 30; $i++) {
            $st = aws cognito-idp describe-user-pool-domain --domain $cd --query "DomainDescription.Status" --output text 2>$null
            if (-not $st -or $st -eq 'None') { break }
            Start-Sleep -Seconds 10
        }
    }
    # (b) Deletion protection is ACTIVE on this pool (CDK default) -- delete
    #     fails silently without this. THIS was the recurring "pool survives
    #     teardown" bug.
    aws cognito-idp update-user-pool --user-pool-id $p.Id --deletion-protection INACTIVE 2>$null | Out-Null
    # (c) Delete + VERIFY loudly instead of swallowing errors.
    Write-Host "  Deleting pool: $($p.Name) ($($p.Id))"
    aws cognito-idp delete-user-pool --user-pool-id $p.Id
    $still = aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Id=='$($p.Id)']|[0].Id" --output text 2>$null
    if ($still -and $still -ne 'None') {
        Write-Host "  ERROR: pool $($p.Id) STILL EXISTS -- delete manually!" -ForegroundColor Red
    } else {
        Write-Host "  Verified deleted." -ForegroundColor Green
    }
}

# --- Step 3: Delete DynamoDB Hospital table ----------------------------------
Write-Host ""
Write-Host "--- Step 3: Deleting DynamoDB table '$DDB_TABLE' ---" -ForegroundColor Cyan
aws dynamodb update-table --table-name $DDB_TABLE --no-deletion-protection-enabled 2>$null | Out-Null
aws dynamodb delete-table --table-name $DDB_TABLE 2>$null | Out-Null
Write-Host "  Delete requested (~30 sec to disappear)."

# --- Step 4: cdk destroy -----------------------------------------------------
Write-Host ""
Write-Host "--- Step 4: cdk destroy $STACK_NAME ---" -ForegroundColor Cyan
Push-Location $CDK_FOLDER
$env:CDK_DEPLOY_ACCOUNT = '483176634665'
$env:CDK_DEPLOY_REGION  = 'us-east-1'
npx cdk destroy $STACK_NAME --force
Pop-Location

# --- Step 5a: Delete leftover non-audit S3 buckets (CDK RETAIN policy) -------
Write-Host ""
Write-Host "--- Step 5a: Delete leftover non-audit S3 buckets ---" -ForegroundColor Cyan
$leftover = aws s3api list-buckets --query "Buckets[?starts_with(Name,'akwadona') || starts_with(Name,'akwadonacdkstack')].Name" --output json | ConvertFrom-Json
foreach ($b in $leftover) {
    if ($b -like 'akwadona-audit*') { continue }
    Empty-Bucket -Bucket $b
    aws s3api delete-bucket --bucket $b 2>$null
    Write-Host "  Deleted $b"
}

# --- Step 5b: Schedule ALL Akwadona KMS keys for 7-day deletion --------------
Write-Host ""
Write-Host "--- Step 5b: Schedule Akwadona KMS keys for 7-day deletion ---" -ForegroundColor Cyan
Write-Host "  Covers stack-level data + audit CMKs (RETAIN policy) AND per-tenant CMKs (wizard-created)."
$allKeys = aws kms list-keys --query "Keys[].KeyId" --output json | ConvertFrom-Json
$scheduled = 0
foreach ($k in $allKeys) {
    $meta = aws kms describe-key --key-id $k --query "KeyMetadata.{State:KeyState,Desc:Description}" --output json 2>$null | ConvertFrom-Json
    if (-not $meta -or $meta.State -ne 'Enabled') { continue }
    $isAkwadona = $false
    # Match by description (stack-level keys)
    if ($meta.Desc -and ($meta.Desc -like '*Akwadona*' -or $meta.Desc -like '*akwadona*')) { $isAkwadona = $true }
    # Match by tag (per-tenant keys)
    if (-not $isAkwadona) {
        $tag = aws kms list-resource-tags --key-id $k --query "Tags[?TagKey=='akwadona:tenantId'].TagValue" --output text 2>$null
        if ($tag -and $tag.Trim().Length -gt 0) { $isAkwadona = $true }
    }
    if ($isAkwadona) {
        aws kms schedule-key-deletion --key-id $k --pending-window-in-days 7 --output text 2>$null | Out-Null
        Write-Host "  Scheduled: $k  ($($meta.Desc))"
        $scheduled++
    }
}
Write-Host "  Scheduled $scheduled CMKs for deletion."

# --- Step 5c: Delete stray akwadona aliases (they point at pending keys) -----
Write-Host ""
Write-Host "--- Step 5c: Delete stray akwadona-* KMS aliases ---" -ForegroundColor Cyan
$aliases = aws kms list-aliases --query "Aliases[?contains(AliasName,'akwadona')].AliasName" --output json | ConvertFrom-Json
foreach ($a in $aliases) {
    aws kms delete-alias --alias-name $a 2>$null
    Write-Host "  Deleted alias: $a"
}

# --- Step 5d: Delete leftover Secrets Manager entries (/akwadona/seed-users/*)
# The AkwadonaUsersFunction Lambda stores each seed user's temp password in
# Secrets Manager as /akwadona/seed-users/<username>. These secrets survive
# `cdk destroy` (no CFN link) and cost ~$0.40 each per month if not cleaned up.
# recover.ps1 will re-create them automatically when the seed users are
# recreated by the users-function custom resource.
Write-Host ""
Write-Host "--- Step 5d: Delete leftover Secrets Manager entries ---" -ForegroundColor Cyan
$secrets = aws secretsmanager list-secrets --query "SecretList[?starts_with(Name,'/akwadona/seed-users/') || contains(Name,'akwadona')].Name" --output json | ConvertFrom-Json
foreach ($s in $secrets) {
    aws secretsmanager delete-secret --secret-id $s --force-delete-without-recovery 2>$null | Out-Null
    Write-Host "  Deleted: $s"
}
Write-Host "  Deleted $($secrets.Count) secret(s)."

# --- Step 5e: Delete orphan Lambda + akwadona log groups ---------------------
Write-Host ""
Write-Host "--- Step 5d: Delete orphan Lambda + akwadona log groups ---" -ForegroundColor Cyan
$liveFns = @(aws lambda list-functions --query "Functions[].FunctionName" --output json | ConvertFrom-Json)
$logGroups = @()
$nt = $null
do {
    if ($nt) {
        $r = aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/' --next-token $nt --output json | ConvertFrom-Json
    } else {
        $r = aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/' --output json | ConvertFrom-Json
    }
    $logGroups += $r.logGroups
    $nt = $r.nextToken
} while ($nt)

$orphans = 0
foreach ($lg in $logGroups) {
    $fn = $lg.logGroupName.Replace('/aws/lambda/', '')
    if ($fn -notin $liveFns) {
        aws logs delete-log-group --log-group-name $lg.logGroupName 2>$null
        $orphans++
    }
}
Write-Host "  Deleted $orphans orphan /aws/lambda/* log groups"

$other = aws logs describe-log-groups --query "logGroups[?contains(logGroupName,'kwadona')].logGroupName" --output json | ConvertFrom-Json
foreach ($lg in $other) { aws logs delete-log-group --log-group-name $lg 2>$null }
Write-Host "  Deleted $($other.Count) other akwadona-named log groups"

# --- Step 6: Auto-bump the audit bucket version suffix in the CDK stack ------
# The old audit bucket cannot be deleted (COMPLIANCE Object Lock), so the next
# deploy MUST use a new bucket name or CFN fails with "already exists".
Write-Host ""
Write-Host "--- Step 6: Bump audit bucket suffix in CDK stack ---" -ForegroundColor Cyan
$stackFile = "$CDK_FOLDER\lib\akwadona-cdk-stack.ts"
$content = Get-Content -Raw -Path $stackFile
if ($content -match 'akwadona-audit-v(\d+)-') {
    $cur  = [int]$Matches[1]
    $next = $cur + 1
    $content = $content -replace "akwadona-audit-v$cur-", "akwadona-audit-v$next-"
    Set-Content -Path $stackFile -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  Bumped audit bucket suffix: v$cur -> v$next"
} else {
    Write-Host "  WARNING: could not find audit bucket suffix pattern. Bump manually!" -ForegroundColor Yellow
}

# --- Summary -----------------------------------------------------------------
Write-Host ""
Write-Host "=== Teardown complete ===" -ForegroundColor Green
Write-Host "Finished at $(Get-Date -Format 'HH:mm:ss')."
Write-Host ""
Write-Host "What is GONE (no bill):" -ForegroundColor Green
Write-Host "  - All Lambdas, API Gateway, CloudFront, Cognito, IAM, log groups"
Write-Host "  - Non-audit S3 buckets (frontend + documents + access-logs)"
Write-Host "  - DynamoDB table '$DDB_TABLE'"
Write-Host ""
Write-Host "What is PENDING (charge stops after deletion):" -ForegroundColor Yellow
Write-Host "  - $scheduled Akwadona KMS keys -- scheduled for deletion in 7 days."
Write-Host "    Cancel inside the window with:"
Write-Host "        aws kms cancel-key-deletion --key-id <ARN>"
Write-Host ""
Write-Host "What REMAINS (immutable / free / trivial):" -ForegroundColor Cyan
Write-Host "  - Audit bucket(s) (COMPLIANCE Object Lock, ~7-year retention)."
Write-Host "  - ACM certificates for akwadona.com + auth.akwadona.com -- free."
Write-Host "  - Route 53 hosted zone (if any) -- ~ `$0.50/month."
Write-Host "  - GoDaddy domain renewal (not AWS)."
Write-Host ""
Write-Host "NEW audit bucket will be created on next deploy with the next version"
Write-Host "suffix (v2 -> v3 -> ...). Bump the version in CDK if needed."
Write-Host ""
Write-Host "To rebuild: .\scripts\recover.ps1" -ForegroundColor Cyan
