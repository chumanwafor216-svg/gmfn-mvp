$base = 'http://127.0.0.1:8012'

# -----------------------------------------
# STEP 0 - LOGIN
# -----------------------------------------
Write-Host 'STEP 0 - Login'

$loginBody = @{
    username = 'admin@test.com'
    password = 'pass1234'
}

$tokenResp = Invoke-RestMethod `
    -Method POST `
    -Uri "$base/auth/login" `
    -Body $loginBody `
    -ContentType 'application/x-www-form-urlencoded'

$token = $tokenResp.access_token

if (-not $token) {
    throw 'Login failed: no access token returned.'
}

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host 'Login OK'

# -----------------------------------------
# STEP 1 - CREATE PAYMENT INSTRUCTION
# This also creates the expected payment
# -----------------------------------------
Write-Host 'STEP 1 - Create Pool Deposit Instruction'

$instructionUrl = "$base/payment-instructions/pool-deposit"

$instructionBody = @{
    amount = '1000.00'
    currency = 'NGN'
    note = 'deterministic bank loop test'
    preferred_rail = 'bank_transfer'
} | ConvertTo-Json

$instruction = Invoke-RestMethod `
    -Method POST `
    -Uri $instructionUrl `
    -Headers $headers `
    -Body $instructionBody `
    -ContentType 'application/json'

$ref = $instruction.reference_display

if (-not $ref) {
    throw 'Instruction creation failed: no reference returned.'
}

Write-Host "Expected reference: $ref"

# -----------------------------------------
# STEP 2 - INGEST BANK EVENT
# -----------------------------------------
Write-Host 'STEP 2 - Ingest Bank Event'

$ingestUrl = "$base/bank/ingest"

$ingestBody = @{
    amount = '1000.00'
    currency = 'NGN'
    direction = 'credit'
    reference = $ref
    description = 'GMFN deterministic loop test payment'
} | ConvertTo-Json

Invoke-RestMethod `
    -Method POST `
    -Uri $ingestUrl `
    -Headers $headers `
    -Body $ingestBody `
    -ContentType 'application/json'

# -----------------------------------------
# STEP 3 - RUN RECONCILIATION
# -----------------------------------------
Write-Host 'STEP 3 - Run Reconciliation'

$reconcileUrl = "$base/bank/reconcile?limit=200&confirm_non_canonical=true&canonical_only_match=false&dry_run=false"

Invoke-RestMethod `
    -Method POST `
    -Uri $reconcileUrl `
    -Headers $headers

# -----------------------------------------
# STEP 4 - VERIFY RECENT BANK EVENTS
# -----------------------------------------
Write-Host 'STEP 4 - Verify Result'

$recentUrl = "$base/bank/recent?limit=20"

Invoke-RestMethod `
    -Method GET `
    -Uri $recentUrl `
    -Headers $headers

# -----------------------------------------
# STEP 5 - RE-INGEST DUPLICATE
# -----------------------------------------
Write-Host 'STEP 5 - Re-ingest Duplicate'

Invoke-RestMethod `
    -Method POST `
    -Uri $ingestUrl `
    -Headers $headers `
    -Body $ingestBody `
    -ContentType 'application/json'

# -----------------------------------------
# STEP 6 - RUN RECONCILIATION AGAIN
# -----------------------------------------
Write-Host 'STEP 6 - Run Reconciliation Again'

Invoke-RestMethod `
    -Method POST `
    -Uri $reconcileUrl `
    -Headers $headers

# -----------------------------------------
# STEP 7 - FINAL STATE
# -----------------------------------------
Write-Host 'STEP 7 - Final State'

Invoke-RestMethod `
    -Method GET `
    -Uri $recentUrl `
    -Headers $headers