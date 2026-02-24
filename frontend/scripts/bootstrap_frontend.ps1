# scripts/bootstrap_frontend.ps1
$ErrorActionPreference = "Stop"

Write-Host "== GMFN Frontend bootstrap ==" -ForegroundColor Cyan
Set-Location (Split-Path $PSScriptRoot -Parent)

npm run dev
