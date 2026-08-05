# =============================================================================
# Akwadona -- Full recover script (T.2). The opposite of teardown.ps1.
#
# Automates EVERYTHING learned from the Aug-2026 rebuild cycle:
#
#   1. Cancels pending per-tenant KMS key deletions (7-day window only).
#   2. PHASE 1 deploy: `cdk deploy -c skipAliases=1` -- creates the whole
#      stack WITHOUT CloudFront aliases. This dodges CloudFront's anti-hijack
#      check, which rejects aliases while GoDaddy CNAMEs still point at the
#      old (destroyed) distribution.
#   3. Prompts you to repoint GoDaddy CNAMEs (www / tiryaq / alshifaa) at the
#      NEW CloudFront domain, then verifies DNS before continuing.
#   4. PHASE 2 deploy: normal `cdk deploy` -- attaches the aliases.
#   5. Cognito custom domain auth.akwadona.com:
#      prompts you to DELETE the stale `auth` CNAME first (Cognito checks
#      DNS), creates the domain, then prompts you to re-add the CNAME
#      pointing at the new Cognito CloudFront target.
#   6. Ensures the PreTokenGeneration V3 trigger is attached (safety net).
#   7. Patches frontend config files with the new pool / client / API IDs
#      straight from the stack outputs (no manual editing).
#   8. Creates the operator user `sami` (permanent password, name attribute,
#      Operator group, custom:tenantId=OPERATOR).
#   9. Builds + ships the Angular frontend to S3 + invalidates CloudFront.
#
# Recovery scope:
#   - KMS keys inside the 7-day window ==> undeleted, tenant data usable.
#   - KMS keys already destroyed ==> wizard-onboarded tenants must be
#     re-onboarded via the operator console (new keys created for each).
#
# Usage:
#
#     .\scripts\recover.ps1
# =============================================================================

$ErrorActionPreference = 'Continue'

# --- Configuration -----------------------------------------------------------
$STACK_NAME     = 'AkwadonaCdkStack'
$USER_POOL_NAME = 'akwadona-user-pool'
$CDK_FOLDER     = "$PSScriptRoot\..\akwadona-cdk"
$APP_FOLDER     = "$PSScriptRoot\.."
$FRONTEND_DIST  = 'dist\verona-ng\browser'
$GODADDY_NS     = 'ns43.domaincontrol.com'
$OPERATOR_USER  = 'sami'
$OPERATOR_EMAIL = 'sami.t.taha98@gmail.com'
$OPERATOR_NAME  = 'Sami'
$OPERATOR_PASS  = 'Apps@1234567'
$SITE_ALIASES   = @('www', 'tiryaq', 'alshifaa')

function Get-StackOutput {
    param([string]$Key)
    return aws cloudformation describe-stacks --stack-name $STACK_NAME `
        --query "Stacks[0].Outputs[?OutputKey=='$Key'].OutputValue|[0]" --output text 2>$null
}

Write-Host "=== Akwadona recover ===" -ForegroundColor Cyan
Write-Host "Starting at $(Get-Date -Format 'HH:mm:ss')."

# --- Step 1: Cancel pending per-tenant KMS key deletions --------------------
Write-Host ""
Write-Host "--- Step 1: Cancel any pending per-tenant KMS key deletions ---" -ForegroundColor Cyan
$allKeys = aws kms list-keys --query "Keys[].KeyId" --output json | ConvertFrom-Json
$revived = 0
foreach ($k in $allKeys) {
    $tags = aws kms list-resource-tags --key-id $k --query "Tags[?TagKey=='akwadona:tenantId'].TagValue" --output text 2>$null
    if (-not $tags -or $tags.Trim().Length -eq 0) { continue }

    $state = aws kms describe-key --key-id $k --query "KeyMetadata.KeyState" --output text 2>$null
    if ($state -eq 'PendingDeletion') {
        Write-Host "  Cancelling deletion: $k (tenant $tags)"
        aws kms cancel-key-deletion --key-id $k --output text 2>$null | Out-Null
        aws kms enable-key --key-id $k 2>$null | Out-Null
        Write-Host "    Re-enabled."
        $revived++
    } elseif ($state -eq 'Disabled') {
        aws kms enable-key --key-id $k 2>$null | Out-Null
        Write-Host "  Re-enabled disabled key: $k (tenant $tags)"
        $revived++
    }
}
Write-Host "  Revived $revived per-tenant CMKs."

# --- Step 2: PHASE 1 deploy (no CloudFront aliases) --------------------------
Write-Host ""
Write-Host "--- Step 2: PHASE 1 cdk deploy (skipAliases=1) ---" -ForegroundColor Cyan
Push-Location $CDK_FOLDER
$env:CDK_DEPLOY_ACCOUNT = '483176634665'
$env:CDK_DEPLOY_REGION  = 'us-east-1'
npx cdk deploy $STACK_NAME -c skipAliases=1 --require-approval never
$phase1Ok = $LASTEXITCODE -eq 0
Pop-Location
if (-not $phase1Ok) {
    Write-Host "PHASE 1 deploy FAILED. Fix the error above and re-run." -ForegroundColor Red
    exit 1
}

$cfDomain = (Get-StackOutput 'CloudFrontUrl') -replace '^https://', ''
$distId   = Get-StackOutput 'DistributionId'
Write-Host "  New CloudFront domain: $cfDomain"

# --- Step 3: Repoint GoDaddy site CNAMEs -------------------------------------
Write-Host ""
Write-Host "--- Step 3: Repoint GoDaddy CNAMEs at the new CloudFront ---" -ForegroundColor Cyan
Write-Host ""
Write-Host "  In GoDaddy DNS Manager, set these CNAME records (TTL 600):" -ForegroundColor Yellow
foreach ($a in $SITE_ALIASES) {
    Write-Host "    $a  ->  $cfDomain" -ForegroundColor Yellow
}
Write-Host ""
Read-Host "  Press ENTER once you have updated GoDaddy"

foreach ($a in $SITE_ALIASES) {
    $ok = $false
    for ($i = 0; $i -lt 12; $i++) {
        $r = Resolve-DnsName "$a.akwadona.com" -Type CNAME -Server $GODADDY_NS -ErrorAction SilentlyContinue |
             Where-Object { $_.NameHost } | Select-Object -First 1
        if ($r -and $r.NameHost -eq $cfDomain) { $ok = $true; break }
        Start-Sleep -Seconds 10
    }
    if ($ok) { Write-Host "  OK   $a.akwadona.com -> $cfDomain" -ForegroundColor Green }
    else     { Write-Host "  FAIL $a.akwadona.com does not resolve to $cfDomain yet (continuing anyway)" -ForegroundColor Red }
}

# --- Step 4: PHASE 2 deploy (attach aliases) ---------------------------------
Write-Host ""
Write-Host "--- Step 4: PHASE 2 cdk deploy (attach aliases) ---" -ForegroundColor Cyan
Push-Location $CDK_FOLDER
npx cdk deploy $STACK_NAME --require-approval never
$phase2Ok = $LASTEXITCODE -eq 0
Pop-Location
if (-not $phase2Ok) {
    Write-Host "PHASE 2 deploy FAILED. Most likely DNS has not propagated -- wait 10 min and re-run this script (phases are idempotent)." -ForegroundColor Red
    exit 1
}

# --- Step 5: Cognito custom domain auth.akwadona.com -------------------------
Write-Host ""
Write-Host "--- Step 5: Cognito custom domain auth.akwadona.com ---" -ForegroundColor Cyan
$poolId = aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='$USER_POOL_NAME']|[0].Id" --output text 2>$null
$domainStatus = aws cognito-idp describe-user-pool-domain --domain auth.akwadona.com --query "DomainDescription.Status" --output text 2>$null

if ($domainStatus -and $domainStatus -ne 'None') {
    Write-Host "  Custom domain already exists (status: $domainStatus). Skipping creation."
} else {
    $authCname = Resolve-DnsName 'auth.akwadona.com' -Type CNAME -Server $GODADDY_NS -ErrorAction SilentlyContinue |
                 Where-Object { $_.NameHost } | Select-Object -First 1
    if ($authCname) {
        Write-Host ""
        Write-Host "  The stale 'auth' CNAME points at $($authCname.NameHost)." -ForegroundColor Yellow
        Write-Host "  DELETE the 'auth' CNAME record in GoDaddy now (Cognito refuses to" -ForegroundColor Yellow
        Write-Host "  create the domain while DNS points at another CloudFront)." -ForegroundColor Yellow
        Read-Host "  Press ENTER once deleted"
    }

    $certArn = aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='*.akwadona.com' || DomainName=='akwadona.com']|[0].CertificateArn" --output text
    $authCf = aws cognito-idp create-user-pool-domain `
        --user-pool-id $poolId `
        --domain auth.akwadona.com `
        --custom-domain-config CertificateArn=$certArn `
        --query "CloudFrontDomain" --output text
    if ($authCf -and $authCf -ne 'None') {
        Write-Host ""
        Write-Host "  Cognito domain created. Now ADD this CNAME in GoDaddy (TTL 600):" -ForegroundColor Yellow
        Write-Host "    auth  ->  $authCf" -ForegroundColor Yellow
        Read-Host "  Press ENTER once added"
    } else {
        Write-Host "  Domain creation failed -- create manually later. See docs/12." -ForegroundColor Red
    }
}

# --- Step 6: Ensure PreTokenGeneration V3 trigger is attached ----------------
Write-Host ""
Write-Host "--- Step 6: Ensure Cognito PreTokenGeneration V3 trigger ---" -ForegroundColor Cyan
$fnArn = aws lambda get-function --function-name cognito-pre-token-generation --query "Configuration.FunctionArn" --output text 2>$null
if ($poolId -and $fnArn) {
    $cfg = '{"PreTokenGenerationConfig":{"LambdaArn":"' + $fnArn + '","LambdaVersion":"V3_0"}}'
    aws cognito-idp update-user-pool --user-pool-id $poolId --lambda-config $cfg 2>$null | Out-Null
    Write-Host "  Attached to pool $poolId"
} else {
    Write-Host "  Skipped (pool or Lambda not found)." -ForegroundColor Yellow
}

# --- Step 7: Patch frontend config with new IDs from stack outputs -----------
Write-Host ""
Write-Host "--- Step 7: Patch frontend config files with new IDs ---" -ForegroundColor Cyan
$newPool   = Get-StackOutput 'UserPoolId'
$newClient = Get-StackOutput 'AppClientId'
$newApi    = Get-StackOutput 'ApiUrl'

if ($newPool -and $newClient -and $newApi) {
    # app.config.ts -- pool id (authority + issuer + jwks) and clientId
    $f = "$APP_FOLDER\src\app.config.ts"
    $c = Get-Content -Raw $f
    $c = $c -replace 'us-east-1_[A-Za-z0-9]+', $newPool
    $c = $c -replace "clientId:\s*'[a-z0-9]+'", "clientId: '$newClient'"
    Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "  Patched src/app.config.ts (pool=$newPool client=$newClient)"

    # cognito-auth.service.ts -- CLIENT_ID
    $f = "$APP_FOLDER\src\app\services\cognito-auth.service.ts"
    $c = Get-Content -Raw $f
    $c = $c -replace "const CLIENT_ID = '[a-z0-9]+';", "const CLIENT_ID = '$newClient';"
    Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "  Patched src/app/services/cognito-auth.service.ts"

    # services/config.ts -- apiBaseUrl
    $f = "$APP_FOLDER\src\app\services\config.ts"
    $c = Get-Content -Raw $f
    $c = $c -replace "apiBaseUrl = 'https://[a-z0-9]+\.execute-api\.us-east-1\.amazonaws\.com'", "apiBaseUrl = '$newApi'"
    Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "  Patched src/app/services/config.ts (api=$newApi)"
} else {
    Write-Host "  Could not read stack outputs -- patch configs manually!" -ForegroundColor Red
}

# --- Step 8: Create operator user --------------------------------------------
Write-Host ""
Write-Host "--- Step 8: Create operator user '$OPERATOR_USER' ---" -ForegroundColor Cyan
$existing = aws cognito-idp admin-get-user --user-pool-id $poolId --username $OPERATOR_USER 2>$null
if ($existing) {
    Write-Host "  Operator user already exists. Skipping."
} else {
    aws cognito-idp admin-create-user `
        --user-pool-id $poolId `
        --username $OPERATOR_USER `
        --user-attributes "Name=email,Value=$OPERATOR_EMAIL" "Name=email_verified,Value=true" "Name=name,Value=$OPERATOR_NAME" "Name=custom:tenantId,Value=OPERATOR" `
        --message-action SUPPRESS 2>$null | Out-Null
    aws cognito-idp admin-set-user-password `
        --user-pool-id $poolId `
        --username $OPERATOR_USER `
        --password $OPERATOR_PASS `
        --permanent 2>$null | Out-Null
    aws cognito-idp admin-add-user-to-group `
        --user-pool-id $poolId `
        --username $OPERATOR_USER `
        --group-name Operator 2>$null | Out-Null
    Write-Host "  Created + password set + added to Operator group."
}

# --- Step 9: Rebuild + ship Angular frontend ---------------------------------
Write-Host ""
Write-Host "--- Step 9: Build + ship Angular frontend ---" -ForegroundColor Cyan
Push-Location $APP_FOLDER
npm run build -- --configuration=production

if (Test-Path $FRONTEND_DIST) {
    $bucketOutput = Get-StackOutput 'S3BucketName'
    if ($bucketOutput -and $bucketOutput -ne 'None') {
        Write-Host "  s3 sync -> $bucketOutput"
        aws s3 sync $FRONTEND_DIST "s3://$bucketOutput" --delete
    }
    if ($distId -and $distId -ne 'None') {
        Write-Host "  Invalidating CloudFront $distId"
        aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --query "Invalidation.Id" --output text
    }
} else {
    Write-Host "  Build output not found ($FRONTEND_DIST). Skipped ship." -ForegroundColor Yellow
}
Pop-Location

# --- Summary -----------------------------------------------------------------
Write-Host ""
Write-Host "=== Recover complete ===" -ForegroundColor Green
Write-Host "Finished at $(Get-Date -Format 'HH:mm:ss')."
Write-Host ""
Write-Host "Stack outputs:" -ForegroundColor Cyan
aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs" --output table
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Wait ~2 min for the CloudFront invalidation, then sign in at"
Write-Host "     https://www.akwadona.com  ($OPERATOR_USER / $OPERATOR_PASS)."
Write-Host "     TIP: first attempt within 5 min of deploy may 504 until the"
Write-Host "     pre-token warmer fires. Use a fresh InPrivate window if the"
Write-Host "     service worker serves a stale bundle (Clear site data)."
Write-Host "  2. Onboard tenants via the operator wizard (docs/17-test-fixtures.md)."
Write-Host "  3. Cognito custom domain takes ~5 min to go ACTIVE:"
Write-Host "     aws cognito-idp describe-user-pool-domain --domain auth.akwadona.com --query DomainDescription.Status --output text"
