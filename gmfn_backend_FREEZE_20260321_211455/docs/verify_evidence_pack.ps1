param(
    [Parameter(Mandatory=$true)]
    [string]$ZipPath
)

Write-Host ""
Write-Host "GMFN Evidence Pack Verifier" -ForegroundColor Cyan
Write-Host "-------------------------------------------"

if (!(Test-Path $ZipPath)) {
    Write-Host "ZIP file not found." -ForegroundColor Red
    exit 1
}

$tempDir = Join-Path $env:TEMP ("gmfn_verify_" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

Expand-Archive -Path $ZipPath -DestinationPath $tempDir -Force

$shaFile = Join-Path $tempDir "SHA256SUMS.txt"

if (!(Test-Path $shaFile)) {
    Write-Host "SHA256SUMS.txt not found inside ZIP." -ForegroundColor Red
    exit 1
}

$lines = Get-Content $shaFile
$allGood = $true

foreach ($line in $lines) {
    if ($line.Trim() -eq "") { continue }

    $parts = $line -split "\s+"
    $expectedHash = $parts[0]
    $fileName = $parts[1]

    $filePath = Join-Path $tempDir $fileName

    if (!(Test-Path $filePath)) {
        Write-Host "Missing file: $fileName" -ForegroundColor Red
        $allGood = $false
        continue
    }

    $actualHash = (Get-FileHash $filePath -Algorithm SHA256).Hash.ToLower()

    if ($actualHash -eq $expectedHash.ToLower()) {
        Write-Host "OK  $fileName" -ForegroundColor Green
    } else {
        Write-Host "FAIL $fileName" -ForegroundColor Red
        $allGood = $false
    }
}

if ($allGood) {
    Write-Host ""
    Write-Host "Integrity check PASSED." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Integrity check FAILED." -ForegroundColor Red
}

Remove-Item -Recurse -Force $tempDir