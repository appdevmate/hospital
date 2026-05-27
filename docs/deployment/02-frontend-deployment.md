# Frontend Deployment (Angular)

Builds the Angular app and publishes it to S3 + CloudFront.

## Prerequisites

- Node.js + npm installed
- AWS CLI configured (profile with S3 sync + CloudFront invalidate)
- Backend already deployed (see `01-cdk-stack-deployment.md`)

## Deploy (PowerShell)

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
aws s3 sync "dist\verona-ng\browser" s3://tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub --delete
aws cloudfront create-invalidation --distribution-id E1Z1ZKYM74LVA7 --paths "/*"
```

## Steps explained

1. Clear Angular build cache
2. Build production bundle → `dist/verona-ng/browser`
3. Sync the build to the S3 frontend bucket (`--delete` removes old files)
4. Invalidate CloudFront cache so users get the new build

## Key values

| Item | Value |
|------|-------|
| Build output | `dist/verona-ng/browser` |
| S3 bucket | `tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub` |
| Distribution ID | `E1Z1ZKYM74LVA7` |
| Live URL | `https://www.akwadona.com` (and CloudFront URL) |

## Verify

```powershell
aws cloudfront list-invalidations --distribution-id E1Z1ZKYM74LVA7 --query "InvalidationList.Items[0].[Id,Status]" --output text
```

- Wait for status → `Completed`
- Hard-refresh the site (Ctrl+F5) or open in incognito

## Notes

- Frontend-only changes need this deploy (not `cdk deploy`)
- Backend code/route changes need `cdk deploy` instead
- One script does both: `deploy.ps1` (repo root)

## Common issues

| Issue | Fix |
|-------|-----|
| Old UI after deploy | Hard-refresh / incognito (cache) |
| Build error | Read `ng build` output → fix TS error |
| `AccessDenied` on sync | Profile lacks S3 write on the bucket |
