param(
    [string]$PostgresImage = 'postgres:18.3-alpine'
)

$ErrorActionPreference = 'Stop'
$containerName = 'gsn-taxonomy-authority-proof-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$databaseName = 'gsn_taxonomy_authority_proof_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$adminPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$containerStarted = $false

try {
    docker image inspect $PostgresImage *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Required cached PostgreSQL image is unavailable: $PostgresImage"
    }

    $containerId = docker run --pull never --rm --detach `
        --label 'gsn.disposable=true' `
        --label 'gsn.purpose=taxonomy-authority-proof' `
        --name $containerName `
        --publish '127.0.0.1::5432' `
        --env "POSTGRES_PASSWORD=$adminPassword" `
        --env "POSTGRES_DB=$databaseName" `
        $PostgresImage
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
        throw 'Failed to start the disposable PostgreSQL proof container.'
    }
    $containerStarted = $true

    $ready = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        docker exec $containerName pg_isready --username postgres --dbname $databaseName *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw 'Disposable PostgreSQL did not become ready within 60 seconds.'
    }

    $portLine = docker port $containerName '5432/tcp'
    if ($LASTEXITCODE -ne 0 -or $portLine -notmatch '^127\.0\.0\.1:(\d+)$') {
        throw "Disposable PostgreSQL is not bound exclusively to localhost: $portLine"
    }
    $hostPort = $Matches[1]
    $inspectRows = docker inspect $containerName | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or $inspectRows.Count -ne 1) {
        throw 'Disposable container inspection failed.'
    }
    $inspect = $inspectRows[0]
    if (
        $inspect.Config.Image -ne $PostgresImage -or
        $inspect.Config.Labels.'gsn.disposable' -ne 'true' -or
        $null -ne $inspect.HostConfig.Binds
    ) {
        throw 'Disposable container isolation check failed.'
    }

    Write-Output "DISPOSABLE_POSTGRES container=$containerName database=$databaseName host=127.0.0.1 port=$hostPort image=$PostgresImage volume_binds=none"
    Write-Output 'TEST_COMMAND python -m pytest tests/test_commerce_taxonomy_postgresql_authority.py -q -s'

    $env:GSN_TAXONOMY_AUTHORITY_PROOF_ADMIN_URL = "postgresql+psycopg://postgres:$adminPassword@127.0.0.1:$hostPort/$databaseName"
    $env:DATABASE_URL = 'sqlite:///:memory:'
    $env:GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED = 'false'
    $env:GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED = 'false'
    $env:GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED = 'false'
    $backendRoot = Split-Path -Parent $PSScriptRoot
    Push-Location $backendRoot
    try {
        python -m pytest tests/test_commerce_taxonomy_postgresql_authority.py -q -s
        if ($LASTEXITCODE -ne 0) {
            throw "PostgreSQL authority proof failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:GSN_TAXONOMY_AUTHORITY_PROOF_ADMIN_URL -ErrorAction SilentlyContinue
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED -ErrorAction SilentlyContinue
    Remove-Item Env:GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED -ErrorAction SilentlyContinue
    Remove-Item Env:GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED -ErrorAction SilentlyContinue
    if ($containerStarted) {
        $cleanupRows = docker inspect $containerName 2>$null | ConvertFrom-Json
        if (
            $LASTEXITCODE -eq 0 -and
            $cleanupRows.Count -eq 1 -and
            $cleanupRows[0].Config.Labels.'gsn.disposable' -eq 'true'
        ) {
            docker rm --force $containerName *> $null
        }
    }
}
