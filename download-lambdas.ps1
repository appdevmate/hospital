# download-lambdas.ps1
# Downloads all Tiryaq Lambda function code from AWS into .\lambda folder
# Run from your project root: .\download-lambdas.ps1
# Requires: AWS CLI configured with us-east-1 access

$Region = "us-east-1"
$OutDir = ".\lambda"

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$Functions = @(
    "getPatientByID"
    "createPatientSurgery"
    "getDoctorByEmail"
    "listAllSurgeriesForPatientByID"
    "createNewDepartment"
    "getPatientsDataByFilters"
    "bulkCreateSpecializations"
    "updatePatientPayment"
    "tiryaq-document-manager"
    "updateDoctor"
    "listAllPaymentsForPatientByID"
    "tiryaq-admin-panel"
    "tiryaq-examinations"
    "createNewSpecialization"
    "tiryaq-audit"
    "getAllDepartments"
    "updatePatient"
    "getAllDoctors"
    "getPaymentByID"
    "bulkCreateDepartments"
    "createPatient"
    "deletePayment"
    "getAllPaymentsForPatient"
    "getAllInvoices"
    "getAllPatients"
    "hardDeleteAllDoctors"
    "deleteAllDepartments"
    "hardDeleteAllPatients"
    "getAllSpecializations"
    "createPatientPayment"
    "getDoctorByID"
    "deleteDoctor"
    "deletePatient"
    "getSurgeryByID"
    "createDoctor"
    "tiryaq-pharmacy"
    "deleteAllSpecializations"
)

$Success = 0
$Failed = 0
$NotFound = @()

Write-Host ""
Write-Host "Downloading $($Functions.Count) Lambda functions to $OutDir ..." -ForegroundColor Cyan
Write-Host ""

foreach ($FnName in $Functions) {
    Write-Host -NoNewline "  $FnName ... "

    # Get the pre-signed download URL
    $Url = aws lambda get-function `
        --function-name $FnName `
        --region $Region `
        --query "Code.Location" `
        --output text 2>$null

    if (-not $Url -or $Url -eq "None" -or $Url -eq "") {
        Write-Host "NOT FOUND" -ForegroundColor Red
        $NotFound += $FnName
        $Failed++
        continue
    }

    # Download the zip
    $ZipPath = "$env:TEMP\$FnName.zip"
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing

    # Extract into .\lambda\<functionName>\
    $Dest = "$OutDir\$FnName"
    if (-not (Test-Path $Dest)) {
        New-Item -ItemType Directory -Path $Dest | Out-Null
    }
    Expand-Archive -Path $ZipPath -DestinationPath $Dest -Force
    Remove-Item $ZipPath -Force

    Write-Host "OK" -ForegroundColor Green
    $Success++
}

Write-Host ""
Write-Host "─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "Downloaded : $Success" -ForegroundColor Green
Write-Host "Failed     : $Failed"  -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })

if ($NotFound.Count -gt 0) {
    Write-Host ""
    Write-Host "Not found in AWS:" -ForegroundColor Yellow
    $NotFound | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "Done. Check the lambda folder then run: cdk diff" -ForegroundColor Cyan