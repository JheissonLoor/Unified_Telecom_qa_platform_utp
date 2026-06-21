param([switch]$SkipNpmAudit)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$composeFile = Join-Path $root "docker-compose.yml"
$backendCoverage = Join-Path $root "reports\test-results\backend-coverage.xml"

function Assert-CommandSucceeded([string]$Name) {
    if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
}

docker compose -f $composeFile config --quiet
Assert-CommandSucceeded "Docker Compose validation"
Push-Location (Join-Path $root "frontend")
try {
    if ($SkipNpmAudit) {
        Write-Warning "npm audit was explicitly skipped; run Trivy and record the external registry outage."
    } else {
        npm.cmd audit --audit-level=high
        Assert-CommandSucceeded "npm audit"
    }
    npm.cmd run lint
    Assert-CommandSucceeded "Frontend lint"
    npm.cmd run test:coverage
    Assert-CommandSucceeded "Frontend tests and coverage"
    npm.cmd run build
    Assert-CommandSucceeded "Frontend build"
} finally { Pop-Location }

docker compose -f $composeFile exec -T backend python -m pytest tests -q `
    --cov=app --cov-config=.coveragerc --cov-report=term-missing `
    --cov-report=xml:/tmp/backend-coverage.xml --cov-fail-under=80
Assert-CommandSucceeded "Backend tests and coverage"
New-Item -ItemType Directory -Force (Split-Path $backendCoverage -Parent) | Out-Null
docker compose -f $composeFile cp backend:/tmp/backend-coverage.xml $backendCoverage
Assert-CommandSucceeded "Backend coverage export"
[xml]$coverageXml = Get-Content $backendCoverage
$coverageXml.coverage.sources.source = "backend/app"
$coverageXml.Save($backendCoverage)
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tests\security\verify_repository.ps1")
Assert-CommandSucceeded "Repository security checks"
Write-Host "Local quality gate passed."
