$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$composeFile = Join-Path $root "docker-compose.yml"
$envPath = Join-Path $root ".env"
$reportDir = Join-Path $root "reports\sonarqube"

if (-not (Test-Path $envPath)) { throw "Run scripts/bootstrap.ps1 first." }
New-Item -ItemType Directory -Force $reportDir | Out-Null

$settings = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#") -and $_.Contains("=")) {
        $name, $value = $_ -split "=", 2
        $settings[$name] = $value
    }
}
$hostPort = if ($settings.HOST_SONAR_PORT) { $settings.HOST_SONAR_PORT } else { "9000" }
$baseUrl = "http://localhost:$hostPort"

docker compose -f $composeFile --profile qa up -d sonarqube
if ($LASTEXITCODE -ne 0) { throw "Could not start SonarQube." }

$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
    try {
        $status = Invoke-RestMethod -Uri "$baseUrl/api/system/status" -TimeoutSec 3
        if ($status.status -eq "UP") {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) { throw "SonarQube did not become ready within 120 seconds." }

powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "secure_sonarqube.ps1")
if ($LASTEXITCODE -ne 0) { throw "SonarQube security bootstrap failed." }

$settings = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#") -and $_.Contains("=")) {
        $name, $value = $_ -split "=", 2
        $settings[$name] = $value
    }
}
$password = $settings.SONAR_ADMIN_PASSWORD
if (-not $password) { throw "SONAR_ADMIN_PASSWORD is missing." }
$basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin:$password"))
$headers = @{ Authorization = "Basic $basic" }
$tokenName = "qa-scan-$([guid]::NewGuid().ToString('N'))"
$generated = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/user_tokens/generate" `
    -Headers $headers -Body @{ name = $tokenName }

$previousToken = $env:SONAR_TOKEN
$previousUrl = $env:SONAR_HOST_URL
$env:SONAR_TOKEN = $generated.token
$env:SONAR_HOST_URL = "http://sonarqube:9000"
try {
    docker run --rm `
        --network unified-telecom-qa-asterik_application `
        --env SONAR_TOKEN `
        --env SONAR_HOST_URL `
        --volume "${root}:/usr/src" `
        sonarsource/sonar-scanner-cli:latest
    if ($LASTEXITCODE -ne 0) { throw "SonarQube scanner failed." }
} finally {
    $env:SONAR_TOKEN = $previousToken
    $env:SONAR_HOST_URL = $previousUrl
    Invoke-RestMethod -Method Post -Uri "$baseUrl/api/user_tokens/revoke" `
        -Headers $headers -Body @{ name = $tokenName } | Out-Null
}

$gate = Invoke-RestMethod -Uri "$baseUrl/api/qualitygates/project_status?projectKey=unified-telecom-qa" `
    -Headers $headers
$metrics = Invoke-RestMethod -Uri `
    "$baseUrl/api/measures/component?component=unified-telecom-qa&metricKeys=coverage,bugs,vulnerabilities,code_smells,security_hotspots,ncloc" `
    -Headers $headers
$summary = @("QUALITY_GATE=$($gate.projectStatus.status)")
$summary += $metrics.component.measures | Sort-Object metric | ForEach-Object { "$($_.metric)=$($_.value)" }
Set-Content -Path (Join-Path $reportDir "summary.txt") -Value $summary -Encoding ascii
$summary | ForEach-Object { Write-Host $_ }
