# Seed TENANT#tiryaq + TENANT#alshifaa profile rows into the Hospital table.
# Run from project root:  .\scripts\seed-tenants.ps1

$now = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

function Put-Tenant {
    param([string]$slug, [string]$tenantId, [string]$name)

    $item = @{
        PK            = @{ S = "TENANT#$slug" }
        SK            = @{ S = "PROFILE" }
        EntityType    = @{ S = "TENANT" }
        slug          = @{ S = $slug }
        tenantId      = @{ S = $tenantId }
        name          = @{ S = $name }
        status        = @{ S = "active" }
        plan          = @{ S = "enterprise" }
        contractStart = @{ S = "2026-01-01" }
        createdAt     = @{ S = $now }
        updatedAt     = @{ S = $now }
        limits        = @{ M = @{
            rps          = @{ N = "100" }
            dailyQuota   = @{ N = "1000000" }
            storageGB    = @{ N = "500" }
            maxUploadMB  = @{ N = "50" }
        }}
    }

    $tmp = New-TemporaryFile
    $json = $item | ConvertTo-Json -Depth 10 -Compress
    # Write without BOM (aws cli rejects BOM-prefixed JSON)
    [System.IO.File]::WriteAllText($tmp.FullName, $json, [System.Text.UTF8Encoding]::new($false))
    aws dynamodb put-item --table-name Hospital --item "file://$($tmp.FullName)"
    Remove-Item $tmp.FullName
    Write-Host "Seeded TENANT#$slug ($tenantId)"
}

Put-Tenant -slug "tiryaq"   -tenantId "T_2572fc71" -name "Tiryaq Hospital"
Put-Tenant -slug "alshifaa" -tenantId "T_a4b8aef9" -name "Alshifaa Hospital"

Write-Host ""
Write-Host "Verifying..."
$vtmp = New-TemporaryFile
[System.IO.File]::WriteAllText($vtmp.FullName, '{":p":{"S":"TENANT#"}}', [System.Text.UTF8Encoding]::new($false))
aws dynamodb scan --table-name Hospital `
    --filter-expression "begins_with(PK, :p)" `
    --expression-attribute-values "file://$($vtmp.FullName)" `
    --query "Items[*].{PK:PK.S,name:name.S,tenantId:tenantId.S}"
Remove-Item $vtmp.FullName
