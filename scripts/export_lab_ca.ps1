$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$destinationDirectory = Join-Path $root "infrastructure\certificates\generated"
$destination = Join-Path $destinationDirectory "nginx-cert.pem"

New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
docker compose -f (Join-Path $root "docker-compose.yml") cp nginx:/etc/nginx/certs/cert.pem $destination
if ($LASTEXITCODE -ne 0) { throw "Could not export the Nginx laboratory CA" }

Write-Host "Laboratory CA exported to infrastructure/certificates/generated/nginx-cert.pem"
