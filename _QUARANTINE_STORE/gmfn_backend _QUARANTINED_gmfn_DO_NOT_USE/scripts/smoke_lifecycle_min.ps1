param(
  [string]$BASE_URL = "http://127.0.0.1:8001",
  [string]$PASSWORD = "123456"
)

$ErrorActionPreference = "Stop"

function Fail([string]$m){ Write-Host ("FAIL: " + $m); exit 1 }
function Ok([string]$m){ Write-Host ("OK: " + $m) }
function Info([string]$m){ Write-Host ("INFO: " + $m) }

function Login([string]$email){
  $form = @{ username=$email; password=$PASSWORD; grant_type="password" }
  $r = Invoke-RestMethod -Method POST -Uri "$BASE_URL/auth/login" -ContentType "application/x-www-form-urlencoded" -Body $form
  return $r.access_token
}

function AuthHeaders([string]$tok, [int]$clanId = 0){
  $h = @{ Authorization = "Bearer $tok" }
  if ($clanId -ne 0) { $h["X-Clan-Id"] = "$clanId" }
  return $h
}

function CreateUser([string]$email, [string]$role="user"){
  $body = ConvertTo-Json @{ email=$email; password=$PASSWORD; role=$role }
  try { Invoke-RestMethod -Method POST -Uri "$BASE_URL/auth/dev/create-user" -ContentType "application/json" -Body $body | Out-Null } catch {}
}

function SelectClan([string]$tok, [int]$clanId){
  Invoke-RestMethod -Method POST -Uri "$BASE_URL/clans/$clanId/select" -Headers (AuthHeaders $tok) | Out-Null
}

function AddMember([string]$adminTok, [int]$clanId, [int]$userId){
  $body = ConvertTo-Json @{ user_id = $userId; role = "user" }
  try {
    Invoke-RestMethod -Method POST -Uri "$BASE_URL/clans/$clanId/members" -Headers (AuthHeaders $adminTok) -ContentType "application/json" -Body $body | Out-Null
  } catch {}
}

function SetPool([string]$adminTok, [int]$clanId, [int]$userId, [int]$balance){
  $body = ConvertTo-Json @{ user_id=$userId; balance=$balance }
  Invoke-RestMethod -Method POST -Uri "$BASE_URL/clans/$clanId/members/pool/set" -Headers (AuthHeaders $adminTok) -ContentType "application/json" -Body $body | Out-Null
}

function Me([string]$tok){
  return Invoke-RestMethod -Method GET -Uri "$BASE_URL/auth/me" -Headers (AuthHeaders $tok)
}

function CreateLoan([string]$borrowerTok, [int]$clanId, [int]$amount){
  $body = ConvertTo-Json @{ clan_id = $clanId; amount = $amount; currency = "NGN" }
  $headers = AuthHeaders $borrowerTok $clanId
  return Invoke-RestMethod -Method POST -Uri "$BASE_URL/loans" -Headers $headers -ContentType "application/json" -Body $body
}

function AddGuarantorToLoan([string]$borrowerTok, [int]$clanId, [int]$loanId, [int]$guarantorUserId, [int]$pledge){
  if ($loanId -le 0) { Fail ("loanId invalid: " + $loanId) }
  $body = ConvertTo-Json @{ guarantor_user_id = $guarantorUserId; pledge_amount = $pledge }
  $headers = AuthHeaders $borrowerTok $clanId
  return Invoke-RestMethod -Method POST -Uri "$BASE_URL/loans/$loanId/guarantors" -Headers $headers -ContentType "application/json" -Body $body
}

function ApproveGuarantor([string]$guarantorTok, [int]$clanId, [int]$loanId, [int]$guarantorRowId){
  $body = ConvertTo-Json @{ status = "approved" }
  $headers = AuthHeaders $guarantorTok $clanId
  return Invoke-RestMethod -Method PATCH -Uri "$BASE_URL/loans/$loanId/guarantors/$guarantorRowId" -Headers $headers -ContentType "application/json" -Body $body
}

function CancelLoan([string]$tok, [int]$clanId, [int]$loanId){
  $headers = AuthHeaders $tok $clanId
  return Invoke-RestMethod -Method POST -Uri "$BASE_URL/loans/$loanId/cancel" -Headers $headers
}

# ---------------------------
# Setup
# ---------------------------
$adminEmail     = "admin@test.com"
$borrowerEmail  = "borrower@test.com"
$g1Email        = "guarantor@test.com"
$g2Email        = "guarantor2@test.com"

Info "Creating dev users"
CreateUser $adminEmail "admin"
CreateUser $borrowerEmail "user"
CreateUser $g1Email "user"
CreateUser $g2Email "user"

Info "Logging in"
$adminTok    = Login $adminEmail
$borrowerTok = Login $borrowerEmail
$g1Tok       = Login $g1Email
$g2Tok       = Login $g2Email
Ok "Logged in 4 users"

$borrowerId = (Me $borrowerTok).id
$g1Id = (Me $g1Tok).id
$g2Id = (Me $g2Tok).id

# Bootstrap clan
$clan = Invoke-RestMethod -Method POST -Uri "$BASE_URL/clans/dev/bootstrap" -Headers (AuthHeaders $adminTok) -ContentType "application/json" -Body (ConvertTo-Json @{ name=("Mini Lifecycle " + (Get-Date -Format "yyyyMMdd-HHmmss")) })
$clanId = if ($clan.id) { [int]$clan.id } elseif ($clan.clan_id) { [int]$clan.clan_id } elseif ($clan.clan -and $clan.clan.id) { [int]$clan.clan.id } else { 0 }
if ($clanId -eq 0) { Fail "Bootstrap clan returned no id" }
Ok ("Clan bootstrapped id=" + $clanId)

SelectClan $adminTok $clanId
SelectClan $borrowerTok $clanId
SelectClan $g1Tok $clanId
SelectClan $g2Tok $clanId

AddMember $adminTok $clanId $borrowerId
AddMember $adminTok $clanId $g1Id
AddMember $adminTok $clanId $g2Id

# Set very high pools so prior exposures don't break the smoke test
SetPool $adminTok $clanId $borrowerId 50
SetPool $adminTok $clanId $g1Id 99999
SetPool $adminTok $clanId $g2Id 99999
Ok "Pools set"

# ---------------------------
# Test 1: incomplete -> approved
# ---------------------------
Info "TEST 1: create over-pool loan (140)"
$loan1 = CreateLoan $borrowerTok $clanId 140
$loan1Id = if ($loan1.id) { [int]$loan1.id } else { 0 }
Ok ("DEBUG loan1Id=" + $loan1Id)
if ($loan1Id -le 0) { Fail ("CreateLoan returned no usable id. Response=" + ($loan1 | ConvertTo-Json -Depth 10)) }

Info "Approve guarantor1 -> expect INCOMPLETE"
$g1row = AddGuarantorToLoan $borrowerTok $clanId $loan1Id $g1Id 70
ApproveGuarantor $g1Tok $clanId $loan1Id ([int]$g1row.id) | Out-Null
Start-Sleep -Seconds 1

$loanCheck = Invoke-RestMethod -Method GET -Uri "$BASE_URL/loans/$loan1Id" -Headers (AuthHeaders $borrowerTok $clanId)
if ($loanCheck.status -ne "incomplete") { Fail ("Expected incomplete, got " + $loanCheck.status) }
Ok "Loan1 is INCOMPLETE"

Info "Approve guarantor2 -> expect APPROVED"
$g2row = AddGuarantorToLoan $borrowerTok $clanId $loan1Id $g2Id 70
ApproveGuarantor $g2Tok $clanId $loan1Id ([int]$g2row.id) | Out-Null
Start-Sleep -Seconds 1

$loanCheck = Invoke-RestMethod -Method GET -Uri "$BASE_URL/loans/$loan1Id" -Headers (AuthHeaders $borrowerTok $clanId)
if ($loanCheck.status -ne "approved") { Fail ("Expected approved, got " + $loanCheck.status) }
Ok "Loan1 is APPROVED"

# ---------------------------
# Test 2: incomplete -> cancelled
# ---------------------------
Info "TEST 2: new loan (140), approve 1 guarantor -> INCOMPLETE, then CANCEL"
$loan2 = CreateLoan $borrowerTok $clanId 140
$loan2Id = if ($loan2.id) { [int]$loan2.id } else { 0 }
if ($loan2Id -le 0) { Fail "Loan2 id missing" }

$g1row2 = AddGuarantorToLoan $borrowerTok $clanId $loan2Id $g1Id 70
ApproveGuarantor $g1Tok $clanId $loan2Id ([int]$g1row2.id) | Out-Null
Start-Sleep -Seconds 1

$loan2Check = Invoke-RestMethod -Method GET -Uri "$BASE_URL/loans/$loan2Id" -Headers (AuthHeaders $borrowerTok $clanId)
if ($loan2Check.status -ne "incomplete") { Fail ("Expected loan2 incomplete, got " + $loan2Check.status) }
Ok "Loan2 is INCOMPLETE"

CancelLoan $borrowerTok $clanId $loan2Id | Out-Null
Start-Sleep -Seconds 1

$loan2Check = Invoke-RestMethod -Method GET -Uri "$BASE_URL/loans/$loan2Id" -Headers (AuthHeaders $borrowerTok $clanId)
if ($loan2Check.status -ne "cancelled") { Fail ("Expected loan2 cancelled, got " + $loan2Check.status) }
Ok "Loan2 is CANCELLED"

Ok "ALL MINI LIFECYCLE TESTS PASSED"
