param(
  [string]$BASE_URL = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

function Fail($m){ Write-Host "❌ $m" -ForegroundColor Red; exit 1 }
function Ok($m){ Write-Host "✅ $m" -ForegroundColor Green }
function Info($m){ Write-Host "ℹ️  $m" }

function ApiJson($method, $path, $token, $body=$null){
  $h = @{}
  if ($token) { $h["Authorization"] = "Bearer $token" }
  if ($env:CLAN_ID) { $h["X-Clan-Id"] = $env:CLAN_ID }
  $uri = $BASE_URL.TrimEnd("/") + $path
  try {
    if ($null -eq $body) {
      return Invoke-RestMethod -Method $method -Uri $uri -Headers $h
    } else {
      return Invoke-RestMethod -Method $method -Uri $uri -Headers $h -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 20)
    }
  } catch {
    $resp = $_.Exception.Response
    $status = if ($resp) { [int]$resp.StatusCode } else { 0 }
    $raw = ""
    if ($resp) {
      try {
        $sr = New-Object IO.StreamReader($resp.GetResponseStream())
        $raw = $sr.ReadToEnd()
      } catch {}
    }
    throw "HTTP $status $method $path :: $raw"
  }
}

function LoginForm($username,$password,$loginPath){
  $uri = $BASE_URL.TrimEnd("/") + $loginPath
  try {
    $form = @{
      username   = $username
      password   = $password
      grant_type = "password"
    }
    $r = Invoke-RestMethod -Method POST -Uri $uri -ContentType "application/x-www-form-urlencoded" -Body $form
    if($r.access_token){ return $r.access_token }
    if($r.token){ return $r.token }
    Fail "Login response missing access_token. Response: $($r | ConvertTo-Json -Depth 5)"
  } catch {
    $resp = $_.Exception.Response
    $status = if ($resp) { [int]$resp.StatusCode } else { 0 }
    $raw = ""
    if ($resp) {
      try {
        $sr = New-Object IO.StreamReader($resp.GetResponseStream())
        $raw = $sr.ReadToEnd()
      } catch {}
    }
    Fail "Login failed HTTP $status at $loginPath :: $raw"
  }
}

# ---- REQUIRED ENV ----
$ADMIN_EMAIL=$env:ADMIN_EMAIL
$ADMIN_PASSWORD=$env:ADMIN_PASSWORD
$BORROWER_EMAIL=$env:BORROWER_EMAIL
$BORROWER_PASSWORD=$env:BORROWER_PASSWORD
$GUARANTOR_EMAIL=$env:GUARANTOR_EMAIL
$GUARANTOR_PASSWORD=$env:GUARANTOR_PASSWORD

if(-not $ADMIN_EMAIL -or -not $ADMIN_PASSWORD -or -not $BORROWER_EMAIL -or -not $BORROWER_PASSWORD -or -not $GUARANTOR_EMAIL -or -not $GUARANTOR_PASSWORD){
  Fail "Set env vars: ADMIN_EMAIL/ADMIN_PASSWORD, BORROWER_EMAIL/BORROWER_PASSWORD, GUARANTOR_EMAIL/GUARANTOR_PASSWORD"
}

# ---- ENDPOINTS ----
$LOGIN = $env:LOGIN_PATH; if(-not $LOGIN){ $LOGIN="/auth/login" }
$ME    = $env:ME_PATH;    if(-not $ME){    $ME="/auth/me" }

$CLANS = $env:CLANS_POST_PATH; if(-not $CLANS){ $CLANS="/clans/dev/bootstrap" }

$LOANS = $env:LOANS_POST_PATH; if(-not $LOANS){ $LOANS="/loans" }
$TOPUP = $env:POOL_TOPUP_PATH; if(-not $TOPUP){ $TOPUP="/admin/pool/topup" }
$PLEDGE_CREATE = $env:PLEDGE_CREATE_PATH; if(-not $PLEDGE_CREATE){ $PLEDGE_CREATE="/loans/{loan_id}/guarantors" }
$PLEDGE_PATCH  = $env:PLEDGE_PATCH_PATH;  if(-not $PLEDGE_PATCH){  $PLEDGE_PATCH="/loan-guarantors/{guarantor_id}" }
$LOAN_GET = $env:LOAN_GET_PATH; if(-not $LOAN_GET){ $LOAN_GET="/loans/{loan_id}" }

Info "Using LOGIN=$LOGIN, ME=$ME, CLANS=$CLANS"

$adminTok = LoginForm $ADMIN_EMAIL $ADMIN_PASSWORD $LOGIN
$borTok   = LoginForm $BORROWER_EMAIL $BORROWER_PASSWORD $LOGIN
$guaTok   = LoginForm $GUARANTOR_EMAIL $GUARANTOR_PASSWORD $LOGIN
Ok "Logged in 3 users"

$borMe = ApiJson "GET" $ME $borTok
$guaMe = ApiJson "GET" $ME $guaTok
$borrowerId = $borMe.id
$guarantorId = $guaMe.id
if(-not $borrowerId -or -not $guarantorId){ Fail "ME endpoint did not return id" }
Ok "Borrower id=$borrowerId Guarantor id=$guarantorId"

# Bootstrap a clan (dev)
$boot = ApiJson "POST" $CLANS $adminTok @{ name=("Smoke Clan " + (Get-Date -Format "yyyyMMdd-HHmmss")) }
$clanId = $null
if($boot.id){ $clanId = $boot.id }
elseif($boot.clan -and $boot.clan.id){ $clanId = $boot.clan.id }
elseif($boot.clan_id){ $clanId = $boot.clan_id }
if(-not $clanId){ Fail "Bootstrap clan response missing clan id. Response: $($boot | ConvertTo-Json -Depth 10)" }
Ok "Clan bootstrapped id=$clanId"
# Select clan for borrower + guarantor sessions (required by API context)
ApiJson "POST" ("/clans/$clanId/select") $borTok  | Out-Null
ApiJson "POST" ("/clans/$clanId/select") $guaTok  | Out-Null
Ok "Clan selected for borrower + guarantor"
# Pool topup borrower to 100
ApiJson "POST" ($TOPUP.Replace("{clan_id}", "$clanId")) $adminTok @{ user_id=$borrowerId; balance=100 } | Out-Null
Ok "Pool topup done"

# Within-pool loan 60 → must auto-approve
$loan1 = ApiJson "POST" $LOANS $borTok @{ clan_id=$clanId; amount="60.00"; purpose="within pool smoke" }
if($loan1.status -ne "approved"){ Fail "Within-pool loan expected approved, got $($loan1.status)" }
Ok "Scenario1 OK (within-pool auto-approved)"

# Over-pool loan 140 → pending
$loan2 = ApiJson "POST" $LOANS $borTok @{ clan_id=$clanId; amount="140.00"; purpose="over pool smoke" }
$loan2Id = $loan2.id
if($loan2.status -ne "pending"){ Fail "Over-pool loan expected pending, got $($loan2.status)" }
Ok "Scenario2 setup OK loan2_id=$loan2Id"

# pledge_amount=0 → must fail
$pc = $PLEDGE_CREATE.Replace("{loan_id}", "$loan2Id")
try {
  ApiJson "POST" $pc $guaTok @{ guarantor_user_id=$guarantorId; pledge_amount=0 } | Out-Null
  Fail "Zero pledge was accepted (should be rejected)"
} catch {
  if($_.Exception.Message -match "HTTP 400|HTTP 422"){ Ok "Zero pledge rejected as expected" } else { throw }
}

# Create pledge and approve
$g = ApiJson "POST" $pc $guaTok @{ guarantor_user_id=$guarantorId; pledge_amount=100 }
$gid = $g.id
if(-not $gid){ Fail "Pledge create did not return id. Response: $($g | ConvertTo-Json -Depth 10)" }

$pp = $PLEDGE_PATCH.Replace("{loan_id}", "$loan2Id").Replace("{guarantor_id}", "$gid")
ApiJson "PATCH" $pp $guaTok @{ status="approved" } | Out-Null
Ok "Guarantor approved"

# Loan2 should now be approved
$lg = $LOAN_GET.Replace("{loan_id}", "$loan2Id")
$loan2fresh = ApiJson "GET" $lg $borTok
if($loan2fresh.status -ne "approved"){ Fail "Expected loan2 approved after coverage, got $($loan2fresh.status)" }
Ok "Scenario3 OK (coverage flips approved)"

Ok "ALL SMOKE TESTS PASSED"
