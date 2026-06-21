param([switch]$ConfigureFirewall)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $root ".env"
$network = "unified-telecom-qa-asterik_voice"

if (-not (Test-Path $envPath)) { throw "Run scripts/bootstrap.ps1 first." }

$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" |
    Where-Object { $_.NextHop -ne "0.0.0.0" } |
    Sort-Object RouteMetric |
    Select-Object -First 1
if (-not $route) { throw "No active IPv4 default route was found." }
$address = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1
if (-not $address) { throw "No LAN IPv4 address was found." }

$voiceSubnet = docker network inspect $network --format "{{(index .IPAM.Config 0).Subnet}}"
if ($LASTEXITCODE -ne 0 -or -not $voiceSubnet) {
    throw "Start the stack before configuring mobile access."
}
$voiceSubnet = $voiceSubnet.Trim()

$lines = [Collections.Generic.List[string]](Get-Content $envPath)
function Set-EnvValue([string]$Name, [string]$Value) {
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match "^$([regex]::Escape($Name))=") {
            $lines[$index] = "$Name=$Value"
            return
        }
    }
    $lines.Add("$Name=$Value")
}

Set-EnvValue "ASTERISK_EXTERNAL_ADDRESS" $address.IPAddress
Set-EnvValue "ASTERISK_LOCAL_NET" $voiceSubnet
[IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))

$settings = @{}
$lines | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#") -and $_.Contains("=")) {
        $name, $value = $_ -split "=", 2
        $settings[$name] = $value
    }
}

if ($ConfigureFirewall) {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) { throw "Open PowerShell as Administrator and run this script again with -ConfigureFirewall." }

    $group = "Unified Telecom QA Mobile Lab"
    Get-NetFirewallRule -Group $group -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName "Telecom QA HTTPS" -Group $group -Direction Inbound `
        -Action Allow -Protocol TCP -LocalPort $settings.HOST_HTTPS_PORT -RemoteAddress LocalSubnet -Profile Any | Out-Null
    New-NetFirewallRule -DisplayName "Telecom QA SIP UDP" -Group $group -Direction Inbound `
        -Action Allow -Protocol UDP -LocalPort $settings.HOST_SIP_UDP_PORT -RemoteAddress LocalSubnet -Profile Any | Out-Null
    New-NetFirewallRule -DisplayName "Telecom QA RTP" -Group $group -Direction Inbound `
        -Action Allow -Protocol UDP -LocalPort "$($settings.HOST_RTP_START)-$($settings.HOST_RTP_END)" `
        -RemoteAddress LocalSubnet -Profile Any | Out-Null
}

Push-Location $root
try {
    docker compose up -d --build --force-recreate asterisk
    if ($LASTEXITCODE -ne 0) { throw "Asterisk could not be recreated." }
    $container = docker compose ps -q asterisk
    $ready = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        if ((docker inspect -f "{{.State.Health.Status}}" $container) -eq "healthy") {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw "Asterisk did not become healthy." }
} finally {
    Pop-Location
}

Write-Host "Mobile lab ready."
Write-Host "PC LAN IP: $($address.IPAddress)"
Write-Host "SIP UDP port: $($settings.HOST_SIP_UDP_PORT)"
Write-Host "RTP ports: $($settings.HOST_RTP_START)-$($settings.HOST_RTP_END)"
if (-not $ConfigureFirewall) {
    Write-Warning "Firewall rules were not changed. Re-run as Administrator with -ConfigureFirewall if the phone cannot connect."
}
