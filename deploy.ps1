<#
    Tiryaq full-stack deploy
    ------------------------
    Deploys the CDK backend (Lambdas + IAM + API Gateway), then builds and
    publishes the Angular frontend to S3 and invalidates CloudFront.

    Backend is deployed FIRST and the script aborts if it fails, so the
    frontend is never shipped against a stale/broken API.

    Prerequisites (must be configured on this machine):
      - AWS CLI authenticated to the correct account/region (aws sts get-caller-identity)
      - Node.js + npm, AWS CDK bootstrapped in the target account
      - Run from the repo root:  powershell -ExecutionPolicy Bypass -File .\deploy.ps1

    Optional flags:
      -BackendOnly    Deploy only the CDK backend.
      -FrontendOnly   Build + publish only the frontend (skip cdk deploy).
      -SkipInvalidation  Skip the CloudFront cache invalidation.
#>

[CmdletBinding()]
param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$SkipInvalidation
)

$ErrorActionPreference = 'Stop'

# ── Config (from docs/test-plan-batch-2026-05-24.md) ─────────────────────────
$S3Bucket        = 'tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub'
$DistributionId  = 'E1Z1ZKYM74LVA7'

# Repo root = the folder this script lives in.
$RepoRoot = $PSScriptRoot
$CdkDir   = Join-Path $RepoRoot 'tiryaq-cdk'
$DistDir  = Join-Path $RepoRoot 'dist\verona-ng\browser'

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

function Assert-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Required command '$name' was not found on PATH."
    }
}

# ── Pre-flight checks ────────────────────────────────────────────────────────
Write-Step 'Pre-flight checks'
Assert-Command 'aws'
Assert-Command 'npx'

Write-Host 'Verifying AWS credentials...'
$identity = aws sts get-caller-identity --output text 2>&1
if ($LASTEXITCODE -ne 0) { throw "AWS credentials are not valid/configured:`n$identity" }
Write-Host "Authenticated as: $identity" -ForegroundColor Green

# ── Phase 1: Backend (CDK) ───────────────────────────────────────────────────
if (-not $FrontendOnly) {
    Write-Step 'Deploying backend (CDK)'
    Push-Location $CdkDir
    try {
        npx cdk deploy --require-approval never
        if ($LASTEXITCODE -ne 0) { throw "cdk deploy failed (exit $LASTEXITCODE)." }
        Write-Host 'Backend deploy complete.' -ForegroundColor Green
    }
    finally { Pop-Location }
}

# ── Phase 2: Frontend (build + publish) ──────────────────────────────────────
if (-not $BackendOnly) {
    Write-Step 'Building frontend (production)'
    Push-Location $RepoRoot
    try {
        # Clean the Angular build cache to avoid stale artifacts.
        Remove-Item -Recurse -Force '.angular\cache' -ErrorAction SilentlyContinue

        npx ng build --configuration production
        if ($LASTEXITCODE -ne 0) { throw "ng build failed (exit $LASTEXITCODE)." }

        if (-not (Test-Path $DistDir)) { throw "Build output not found at $DistDir" }

        Write-Step "Syncing to s3://$S3Bucket"
        aws s3 sync $DistDir "s3://$S3Bucket" --delete
        if ($LASTEXITCODE -ne 0) { throw "s3 sync failed (exit $LASTEXITCODE)." }

        if (-not $SkipInvalidation) {
            Write-Step "Invalidating CloudFront ($DistributionId)"
            $invalidation = aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" --query 'Invalidation.Id' --output text
            if ($LASTEXITCODE -ne 0) { throw "CloudFront invalidation failed (exit $LASTEXITCODE)." }
            Write-Host "Invalidation created: $invalidation" -ForegroundColor Green
            Write-Host 'Wait for it to reach "Completed", then hard-refresh the site.' -ForegroundColor Yellow
        }

        Write-Host 'Frontend deploy complete.' -ForegroundColor Green
    }
    finally { Pop-Location }
}

Write-Step 'Done'
Write-Host 'Deployment finished successfully.' -ForegroundColor Green
