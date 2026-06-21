$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env"
$scenarioDir = Join-Path $root "tests\load"
$runner = Join-Path $root "scripts\run_sipp_call.sh"
$uasScript = Join-Path $scenarioDir "sip_uas_1002.py"
$resultDir = Join-Path $root "reports\test-results\sipp"
$network = "unified-telecom-qa-asterik_voice"

if (-not (Test-Path $envFile)) { throw "Missing .env. Run scripts/bootstrap.ps1 first." }
New-Item -ItemType Directory -Force $resultDir | Out-Null
Remove-Item (Join-Path $resultDir "uac-messages.log") -Force -ErrorAction SilentlyContinue

$settings = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#") -and $_.Contains("=")) {
        $name, $value = $_ -split "=", 2
        $settings[$name] = $value
    }
}
foreach ($required in @("SIP_1001_SECRET", "SIP_1002_SECRET")) {
    if (-not $settings[$required] -or $settings[$required] -eq "REPLACE_ME") {
        throw "Missing required setting: $required"
    }
}

$before = docker compose exec -T postgres psql -U telecom_app -d telecom_qa -Atc `
    "SELECT COALESCE(MAX(id), 0) FROM call_detail_records;"
if ($LASTEXITCODE -ne 0) { throw "Could not read the CDR baseline." }

$previous1001 = $env:SIP_1001_SECRET
$previous1002 = $env:SIP_1002_SECRET
$env:SIP_1001_SECRET = $settings.SIP_1001_SECRET
$env:SIP_1002_SECRET = $settings.SIP_1002_SECRET
$uasContainer = "telecom-qa-sip-uas-1002"
$gateway = docker network inspect $network --format "{{(index .IPAM.Config 0).Gateway}}"
if ($LASTEXITCODE -ne 0 -or -not $gateway) { throw "Could not inspect Docker voice network." }
$gatewayParts = $gateway.Trim() -split "\."
$uasIp = "$($gatewayParts[0]).$($gatewayParts[1]).$($gatewayParts[2]).250"

try {
    if (docker ps -aq --filter "name=^${uasContainer}$") {
        docker rm -f $uasContainer | Out-Null
    }
    docker run -d `
        --name $uasContainer `
        --network $network `
        --ip $uasIp `
        --env SIP_1002_SECRET `
        --volume "${uasScript}:/runner/sip_uas_1002.py:ro" `
        --entrypoint python `
        python:3.12-slim `
        /runner/sip_uas_1002.py | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not start the 1002 SIP test peer." }

    $registered = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        $uasLog = (cmd.exe /d /c "docker logs $uasContainer 2>&1" | Out-String)
        if ($uasLog -match "REGISTERED 1002") {
            $registered = $true
            break
        }
        if ((docker inspect -f "{{.State.Running}}" $uasContainer) -eq "false") { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $registered) { throw "Extension 1002 did not register. Container output: $uasLog" }

    docker run --rm `
        --network $network `
        --env SIP_1001_SECRET `
        --volume "${scenarioDir}:/scenarios:ro" `
        --volume "${resultDir}:/results" `
        --volume "${runner}:/runner/run_sipp_call.sh:ro" `
        --entrypoint /bin/bash `
        ctaloi/sipp:latest `
        /runner/run_sipp_call.sh
    if ($LASTEXITCODE -ne 0) { throw "SIPp signaling scenario failed. Review reports/test-results/sipp/." }

    $uasExit = docker wait $uasContainer
    $uasLog = (cmd.exe /d /c "docker logs $uasContainer 2>&1" | Out-String)
    Set-Content -Path (Join-Path $resultDir "uas-output.log") -Value $uasLog -Encoding ascii
    if ($uasExit -ne "0" -or $uasLog -notmatch "CALL_COMPLETED 1001->1002") {
        throw "The 1002 SIP test peer did not complete the call. Review uas-output.log."
    }
}
finally {
    if (docker ps -aq --filter "name=^${uasContainer}$") {
        $finalUasLog = (cmd.exe /d /c "docker logs $uasContainer 2>&1" | Out-String)
        Set-Content -Path (Join-Path $resultDir "uas-output.log") -Value $finalUasLog -Encoding ascii
        docker rm -f $uasContainer | Out-Null
    }
    $env:SIP_1001_SECRET = $previous1001
    $env:SIP_1002_SECRET = $previous1002
}

Start-Sleep -Seconds 2
$cdr = docker compose exec -T postgres psql -U telecom_app -d telecom_qa -Atc `
    "SELECT id || '|' || src || '|' || dst || '|' || disposition || '|' || billsec FROM call_detail_records WHERE id > $before AND src = '1001' AND dst = '1002' AND disposition = 'ANSWERED' ORDER BY id DESC LIMIT 1;"
if ($LASTEXITCODE -ne 0 -or -not $cdr) {
    throw "SIP signaling completed, but no new ANSWERED CDR for 1001 -> 1002 was found."
}

Set-Content -Path (Join-Path $resultDir "accepted-cdr.txt") -Value $cdr -Encoding ascii
Write-Host "Traditional SIP acceptance passed. CDR: $cdr"
