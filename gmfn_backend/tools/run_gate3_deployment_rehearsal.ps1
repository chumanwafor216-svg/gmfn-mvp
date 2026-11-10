param(
    [string]$PostgresImage = 'postgres:18.3-alpine'
)

$ErrorActionPreference = 'Stop'
$runId = [guid]::NewGuid().ToString('N').Substring(0, 12)
$containerName = "gsn-gate3-rehearsal-$runId"
$databaseName = "gsn_gate3_rehearsal_$runId"
$adminPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$artifactDirectory = Join-Path 'C:\tmp' ("gsn-gate3-$runId")
$containerStarted = $false

try {
    docker image inspect $PostgresImage *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Required cached PostgreSQL image is unavailable: $PostgresImage"
    }

    New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
    $containerId = docker run --pull never --rm --detach `
        --label 'gsn.disposable=true' `
        --label 'gsn.purpose=gate3-deployment-rehearsal' `
        --name $containerName `
        --publish '127.0.0.1::5432' `
        --env "POSTGRES_PASSWORD=$adminPassword" `
        --env "POSTGRES_DB=$databaseName" `
        $PostgresImage
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
        throw 'Failed to start the disposable PostgreSQL rehearsal container.'
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
        $inspect.Config.Labels.'gsn.purpose' -ne 'gate3-deployment-rehearsal' -or
        $null -ne $inspect.HostConfig.Binds
    ) {
        throw 'Disposable container isolation check failed.'
    }

    Write-Output "DISPOSABLE_POSTGRES container=$containerName database=$databaseName host=127.0.0.1 port=$hostPort image=$PostgresImage volume_binds=none"
    Write-Output "ARTIFACT_DIRECTORY $artifactDirectory"
    Write-Output 'TEST_COMMAND python -m pytest gate3/test_deployment_rehearsal.py -q -s'

    $env:GSN_GATE3_ADMIN_URL = "postgresql+psycopg://postgres:$adminPassword@127.0.0.1:$hostPort/$databaseName"
    $env:GSN_GATE3_ARTIFACT_DIR = $artifactDirectory
    $backendRoot = Split-Path -Parent $PSScriptRoot
    Push-Location $backendRoot
    try {
        python -m pytest gate3/test_deployment_rehearsal.py -q -s `
            --basetemp (Join-Path $artifactDirectory 'pytest')
        if ($LASTEXITCODE -ne 0) {
            throw "Gate 3 deployment rehearsal failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:GSN_GATE3_ADMIN_URL -ErrorAction SilentlyContinue
    Remove-Item Env:GSN_GATE3_ARTIFACT_DIR -ErrorAction SilentlyContinue
    if ($containerStarted) {
        $cleanupRows = docker inspect $containerName 2>$null | ConvertFrom-Json
        if (
            $LASTEXITCODE -eq 0 -and
            $cleanupRows.Count -eq 1 -and
            $cleanupRows[0].Config.Labels.'gsn.disposable' -eq 'true' -and
            $cleanupRows[0].Config.Labels.'gsn.purpose' -eq 'gate3-deployment-rehearsal'
        ) {
            docker rm --force $containerName *> $null
        }
    }
}
