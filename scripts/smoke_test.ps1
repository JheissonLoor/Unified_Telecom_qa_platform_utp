$ErrorActionPreference = "Stop"

$settings = @{}
Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) ".env") | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#") -and $_.Contains("=")) {
        $name, $value = $_ -split "=", 2
        $settings[$name] = $value
    }
}
$httpsPort = if ($settings.HOST_HTTPS_PORT) { $settings.HOST_HTTPS_PORT } else { "443" }
$midpointPort = if ($settings.HOST_MIDPOINT_PORT) { $settings.HOST_MIDPOINT_PORT } else { "8080" }

$services = docker compose ps --services --filter status=running
$required = @("postgres", "backend", "frontend", "asterisk", "coturn", "midpoint", "nginx")
$missing = $required | Where-Object { $_ -notin $services }
if ($missing) { throw "Services not running: $($missing -join ', ')" }

$health = curl.exe -ksS "https://localhost:$httpsPort/health"
if ($health -notmatch "ok") { throw "Nginx health endpoint failed" }

docker compose exec -T asterisk asterisk -rx "core waitfullybooted"
docker compose exec -T asterisk asterisk -rx "pjsip show endpoints"
docker compose exec -T postgres pg_isready -U telecom_app -d telecom_qa

Write-Host "Smoke test completed. Browser: https://localhost:$httpsPort"
Write-Host "API docs: https://localhost:$httpsPort/docs | midPoint: http://localhost:$midpointPort/midpoint"
