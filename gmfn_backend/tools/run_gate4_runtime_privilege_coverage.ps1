param(
    [string]$PostgresImage = 'postgres:18.3-alpine',
    [string]$ExistingArtifactDirectory = ''
)

$ErrorActionPreference = 'Stop'
$runId = [guid]::NewGuid().ToString('N').Substring(0, 12)
$containerName = "gsn-gate4-coverage-$runId"
$databaseName = "gsn_gate4_coverage_$runId"
$adminPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$artifactDirectory = if ([string]::IsNullOrWhiteSpace($ExistingArtifactDirectory)) {
    Join-Path 'C:\tmp' ("gsn-gate4-$runId")
} else {
    (Resolve-Path -LiteralPath $ExistingArtifactDirectory).Path
}
$inventoryPath = Join-Path $artifactDirectory 'route-inventory.json'
$tracePath = Join-Path $artifactDirectory 'sql-trace.json'
$contractPath = Join-Path $artifactDirectory 'runtime-privilege-contract.json'
$containerStarted = $false

try {
    docker image inspect $PostgresImage *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Required cached PostgreSQL image is unavailable: $PostgresImage"
    }
    New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
    $backendRoot = Split-Path -Parent $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($ExistingArtifactDirectory)) {
        Push-Location $backendRoot
        try {
            $env:DATABASE_URL = 'sqlite:///:memory:'
            $env:GMFN_DEV_MODE = 'false'
            $env:GMFN_AUTO_CREATE_SCHEMA = 'false'
            $env:GMFN_ENABLE_RECONCILIATION_LOOP = 'false'
            $env:GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP = 'false'
            $env:GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED = 'false'
            $env:GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED = 'false'
            $env:GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED = 'false'
            $env:GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED = 'false'
            python tools/gate4_runtime_inventory.py --output $inventoryPath
            if ($LASTEXITCODE -ne 0) { throw 'Gate 4 route inventory failed.' }

            $env:GSN_GATE4_SQL_TRACE_OUTPUT = $tracePath
            python -m pytest -p tools.gate4_sql_trace_plugin tests -q `
                --basetemp (Join-Path $artifactDirectory 'pytest-regression')
            if ($LASTEXITCODE -ne 0) { throw 'Gate 4 traced regression failed.' }

            python tools/gate4_build_privilege_contract.py `
                --inventory $inventoryPath --trace $tracePath --output $contractPath
            if ($LASTEXITCODE -ne 0) { throw 'Gate 4 privilege contract generation failed.' }
        }
        finally {
            Remove-Item Env:GSN_GATE4_SQL_TRACE_OUTPUT -ErrorAction SilentlyContinue
            Pop-Location
        }
    } elseif (
        -not (Test-Path -LiteralPath $inventoryPath) -or
        -not (Test-Path -LiteralPath $tracePath) -or
        -not (Test-Path -LiteralPath $contractPath)
    ) {
        throw 'Existing Gate 4 artifact directory is incomplete.'
    }

    $containerId = docker run --pull never --rm --detach `
        --label 'gsn.disposable=true' `
        --label 'gsn.purpose=gate4-runtime-privilege-coverage' `
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
        $inspect.Config.Labels.'gsn.purpose' -ne 'gate4-runtime-privilege-coverage' -or
        $null -ne $inspect.HostConfig.Binds
    ) {
        throw 'Disposable PostgreSQL isolation check failed.'
    }

    Write-Output "DISPOSABLE_POSTGRES container=$containerName database=$databaseName host=127.0.0.1 port=$hostPort image=$PostgresImage volume_binds=none"
    Write-Output "GATE4_ARTIFACT_DIRECTORY $artifactDirectory"
    $env:GSN_GATE4_ADMIN_URL = "postgresql+psycopg://postgres:$adminPassword@127.0.0.1:$hostPort/$databaseName"
    $env:GSN_GATE4_ARTIFACT_DIR = $artifactDirectory
    $env:GSN_GATE4_CONTRACT_PATH = $contractPath
    Push-Location $backendRoot
    try {
        python -m pytest gate4/test_runtime_privilege_coverage.py -q -s `
            --basetemp (Join-Path $artifactDirectory 'pytest-postgresql')
        if ($LASTEXITCODE -ne 0) {
            throw "Gate 4 PostgreSQL verification failed with exit code $LASTEXITCODE"
        }
    }
    finally { Pop-Location }
}
finally {
    foreach ($name in @(
        'DATABASE_URL', 'GMFN_DEV_MODE', 'GMFN_AUTO_CREATE_SCHEMA',
        'GMFN_ENABLE_RECONCILIATION_LOOP', 'GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP',
        'GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED',
        'GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED',
        'GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED',
        'GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED',
        'GSN_GATE4_ADMIN_URL', 'GSN_GATE4_ARTIFACT_DIR', 'GSN_GATE4_CONTRACT_PATH'
    )) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
    if ($containerStarted) {
        $cleanupRows = docker inspect $containerName 2>$null | ConvertFrom-Json
        if (
            $LASTEXITCODE -eq 0 -and
            $cleanupRows.Count -eq 1 -and
            $cleanupRows[0].Config.Labels.'gsn.disposable' -eq 'true' -and
            $cleanupRows[0].Config.Labels.'gsn.purpose' -eq 'gate4-runtime-privilege-coverage'
        ) {
            docker rm --force $containerName *> $null
        }
    }
}
