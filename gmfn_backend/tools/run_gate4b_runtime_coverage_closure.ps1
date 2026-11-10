param(
    [string]$PostgresImage = 'postgres:18.3-alpine',
    [string]$Gate4ArtifactDirectory = 'C:\tmp\gsn-gate4-c2c41bb9c0d7',
    [string]$ContractPath = ''
)

$ErrorActionPreference = 'Stop'
$runId = [guid]::NewGuid().ToString('N').Substring(0, 12)
$containerName = "gsn-gate4b-coverage-$runId"
$databaseName = "gsn_gate4b_coverage_$runId"
$adminPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$artifactDirectory = Join-Path 'C:\tmp' ("gsn-gate4b-$runId")
$contractPath = if ([string]::IsNullOrWhiteSpace($ContractPath)) {
    Join-Path $Gate4ArtifactDirectory 'runtime-privilege-contract.json'
} else {
    (Resolve-Path -LiteralPath $ContractPath).Path
}
$containerStarted = $false

try {
    if (-not (Test-Path -LiteralPath $contractPath)) {
        throw "Gate 4 contract is missing: $contractPath"
    }
    docker image inspect $PostgresImage *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Required cached PostgreSQL image is unavailable: $PostgresImage"
    }
    New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
    $containerId = docker run --pull never --rm --detach `
        --label 'gsn.disposable=true' `
        --label 'gsn.purpose=gate4b-runtime-coverage-closure' `
        --name $containerName `
        --publish '127.0.0.1::5432' `
        --env "POSTGRES_PASSWORD=$adminPassword" `
        --env "POSTGRES_DB=$databaseName" `
        $PostgresImage
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
        throw 'Failed to start disposable PostgreSQL.'
    }
    $containerStarted = $true
    $ready = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        docker exec $containerName pg_isready --username postgres --dbname $databaseName *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Disposable PostgreSQL did not become ready.' }
    $portLine = docker port $containerName '5432/tcp'
    if ($LASTEXITCODE -ne 0 -or $portLine -notmatch '^127\.0\.0\.1:(\d+)$') {
        throw "PostgreSQL is not localhost-only: $portLine"
    }
    $hostPort = $Matches[1]
    $inspectRows = docker inspect $containerName | ConvertFrom-Json
    $inspect = $inspectRows[0]
    if (
        $inspect.Config.Labels.'gsn.disposable' -ne 'true' -or
        $inspect.Config.Labels.'gsn.purpose' -ne 'gate4b-runtime-coverage-closure' -or
        $null -ne $inspect.HostConfig.Binds
    ) {
        throw 'Disposable PostgreSQL isolation check failed.'
    }

    Write-Output "DISPOSABLE_POSTGRES container=$containerName database=$databaseName host=127.0.0.1 port=$hostPort image=$PostgresImage volume_binds=none"
    Write-Output "GATE4B_ARTIFACT_DIRECTORY $artifactDirectory"
    $env:GSN_GATE4B_ADMIN_URL = "postgresql+psycopg://postgres:$adminPassword@127.0.0.1:$hostPort/$databaseName"
    $env:GSN_GATE4B_ARTIFACT_DIR = $artifactDirectory
    $env:GSN_GATE4B_CONTRACT_PATH = $contractPath
    $env:GSN_GATE4_CONTRACT_PATH = $contractPath
    $backendRoot = Split-Path -Parent $PSScriptRoot
    Push-Location $backendRoot
    try {
        python -m pytest gate4/test_runtime_coverage_closure.py -q -s `
            --basetemp (Join-Path $artifactDirectory 'pytest-postgresql')
        if ($LASTEXITCODE -ne 0) {
            throw "Gate 4B PostgreSQL verification failed with exit code $LASTEXITCODE"
        }
    }
    finally { Pop-Location }
}
finally {
    foreach ($name in @(
        'GSN_GATE4B_ADMIN_URL', 'GSN_GATE4B_ARTIFACT_DIR',
        'GSN_GATE4B_CONTRACT_PATH', 'GSN_GATE4_CONTRACT_PATH'
    )) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
    if ($containerStarted) {
        $cleanupRows = docker inspect $containerName 2>$null | ConvertFrom-Json
        if (
            $LASTEXITCODE -eq 0 -and
            $cleanupRows.Count -eq 1 -and
            $cleanupRows[0].Config.Labels.'gsn.disposable' -eq 'true' -and
            $cleanupRows[0].Config.Labels.'gsn.purpose' -eq 'gate4b-runtime-coverage-closure'
        ) {
            docker rm --force $containerName *> $null
        }
    }
}
