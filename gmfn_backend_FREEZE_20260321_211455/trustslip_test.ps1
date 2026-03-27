param(
  [string]$BaseUrl = "http://127.0.0.1:8000",
  [string]$Email = "admin@test.com",
  [string]$Password = "admin123",
  [switch]$DoRelease = $false
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host ""
  Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Write-Pass($msg) {
  Write-Host "[PASS] $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
  Write-Host "[FAIL] $msg" -ForegroundColor Red
}

function Invoke-JsonGet {
  param(
    [string]$Url,
    [hashtable]$Headers = @{}
  )
  return Invoke-RestMethod -Method GET -Uri $Url -Headers $Headers
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    [object]$Body,
    [hashtable]$Headers = @{}
  )
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method POST -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json
}

function Invoke-FormPost {
  param(
    [string]$Url,
    [hashtable]$Form
  )
  return Invoke-RestMethod -Method POST -Uri $Url -Body $Form -ContentType "application/x-www-form-urlencoded"
}

try {
  Write-Step "1. Login"

  $loginRes = Invoke-FormPost -Url "$BaseUrl/auth/login" -Form @{
    username      = $Email
    password      = $Password
    grant_type    = ""
    scope         = ""
    client_id     = ""
    client_secret = ""
  }

  if (-not $loginRes.access_token) {
    throw "Login succeeded but access_token was missing."
  }

  $Token = $loginRes.access_token
  $AuthHeaders = @{
    Authorization = "Bearer $Token"
    Accept        = "application/json"
  }

  Write-Pass "Logged in successfully."

  Write-Step "2. Get current user"

  $me = Invoke-JsonGet -Url "$BaseUrl/auth/me" -Headers $AuthHeaders
  $userId = $me.id
  $role = $me.role
  $gmfnId = $me.gmfn_id

  Write-Host "User ID: $userId"
  Write-Host "Role: $role"
  Write-Host "GMFN ID: $gmfnId"
  Write-Pass "Fetched current user."

  Write-Step "3. Get my TrustSlip"

  $mySlip = Invoke-JsonGet -Url "$BaseUrl/trust-slips/me" -Headers $AuthHeaders
  $mySlip | ConvertTo-Json -Depth 10
  Write-Pass "Fetched /trust-slips/me."

  Write-Step "4. Issue my TrustSlip"

  $issueRes = Invoke-JsonPost -Url "$BaseUrl/trust-slips/me/issue" -Headers $AuthHeaders -Body @{}
  $issueRes | ConvertTo-Json -Depth 10

  if (-not $issueRes.code) {
    throw "Issue response did not contain a TrustSlip code."
  }

  $Code = [string]$issueRes.code
  Write-Host "TrustSlip Code: $Code" -ForegroundColor Yellow
  Write-Pass "Issue endpoint responded correctly."

  Write-Step "5. Reissue check"

  $reissueCheck = Invoke-JsonGet -Url "$BaseUrl/trust-slips/me/reissue-check" -Headers $AuthHeaders
  $reissueCheck | ConvertTo-Json -Depth 10
  Write-Pass "Fetched reissue check."

  Write-Step "6. Public verify JSON"

  $verifyJson = Invoke-JsonGet -Url "$BaseUrl/trust-slips/verify/$Code" -Headers @{ Accept = "application/json" }
  $verifyJson | ConvertTo-Json -Depth 12

  if (-not $verifyJson.code) {
    throw "Verify JSON did not return a code."
  }

  Write-Pass "Public verify JSON works."

  Write-Step "7. Share bundle"

  $shareBundle = Invoke-JsonGet -Url "$BaseUrl/trust-slips/$Code/share" -Headers $AuthHeaders
  $shareBundle | ConvertTo-Json -Depth 12
  Write-Pass "Share bundle works."

  Write-Step "8. Share text"

  $shareText = Invoke-JsonGet -Url "$BaseUrl/trust-slips/verify/$Code/share-text" -Headers @{ Accept = "application/json" }
  $shareText | ConvertTo-Json -Depth 10
  Write-Pass "Public share text works."

  Write-Step "9. Lite verify page"

  $litePage = Invoke-WebRequest -Method GET -Uri "$BaseUrl/trust-slips/verify/$Code/lite"
  if ($litePage.StatusCode -ne 200) {
    throw "Lite verify page returned HTTP $($litePage.StatusCode)"
  }

  if ($litePage.Content -match "VALID|EXPIRED|DO NOT RELEASE|OK TO RELEASE GOODS") {
    Write-Pass "Lite verify page rendered expected merchant status text."
  } else {
    Write-Fail "Lite verify page loaded, but expected merchant status text was not found."
  }

  Write-Step "10. Full verify page"

  $fullPage = Invoke-WebRequest -Method GET -Uri "$BaseUrl/trust-slips/verify/$Code/page"
  if ($fullPage.StatusCode -ne 200) {
    throw "Full verify page returned HTTP $($fullPage.StatusCode)"
  }
  Write-Pass "Full verify page works."

  if ($DoRelease) {
    Write-Step "11. Log release (admin-only)"

    $releaseBody = @{
      supplier_name   = "Test Merchant"
      supplier_phone  = "08000000000"
      amount_released = "15000.00"
      note            = "PowerShell smoke test release"
    }

    $releaseRes = Invoke-JsonPost -Url "$BaseUrl/trust-slips/$Code/release" -Headers $AuthHeaders -Body $releaseBody
    $releaseRes | ConvertTo-Json -Depth 10
    Write-Pass "Release logging works."
  } else {
    Write-Host "Skipping release logging. Run with -DoRelease to test admin release flow." -ForegroundColor DarkYellow
  }

  Write-Step "SUMMARY"
  Write-Host "TrustSlip smoke test completed successfully." -ForegroundColor Green
  Write-Host "Code: $Code" -ForegroundColor Yellow
}
catch {
  Write-Step "ERROR"
  Write-Fail $_.Exception.Message
  exit 1
}