$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root "reports\trivy"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$arguments = @(
    "run", "--rm",
    "-v", "${root}:/workspace",
    "-v", "${out}/cache:/root/.cache/trivy",
    "aquasec/trivy:0.65.0", "fs",
    "--scanners", "vuln,secret,misconfig",
    "--severity", "HIGH,CRITICAL",
    "--cache-dir", "/root/.cache/trivy",
    "--timeout", "10m",
    "--skip-dirs", "/workspace/.git",
    "--skip-dirs", "/workspace/.venv",
    "--skip-dirs", "/workspace/frontend/node_modules",
    "--skip-dirs", "/workspace/frontend/coverage",
    "--skip-dirs", "/workspace/frontend/dist",
    "--skip-dirs", "/workspace/reports",
    "--format", "json",
    "--output", "/workspace/reports/trivy/filesystem.json",
    "/workspace"
)
& docker $arguments
if ($LASTEXITCODE -ne 0) { throw "Trivy execution failed" }

Write-Host "Trivy report: reports/trivy/filesystem.json"
