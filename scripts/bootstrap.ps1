$ErrorActionPreference = "Stop"

function New-RandomValue([int]$Bytes = 24) {
    $buffer = New-Object byte[] $Bytes
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($buffer).Replace("+", "A").Replace("/", "B").TrimEnd("=")
}

function New-FernetKey {
    $buffer = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($buffer).Replace("+", "-").Replace("/", "_")
}

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path -LiteralPath $envPath) {
    Write-Host ".env already exists; no values were replaced."
    exit 0
}

$values = @{
    POSTGRES_PASSWORD = New-RandomValue
    MIDPOINT_DB_PASSWORD = New-RandomValue
    JWT_SECRET = New-RandomValue 48
    APP_ENCRYPTION_KEY = New-FernetKey
    PROVISIONING_TOKEN = New-RandomValue 48
    ASTERISK_AMI_SECRET = New-RandomValue 32
    DEMO_AGENT_PASSWORD = New-RandomValue
    DEMO_AGENT2_PASSWORD = New-RandomValue
    DEMO_SUPERVISOR_PASSWORD = New-RandomValue
    DEMO_ADMIN_PASSWORD = New-RandomValue
    SIP_1001_SECRET = New-RandomValue
    SIP_1002_SECRET = New-RandomValue
    WEBRTC_2001_SECRET = New-RandomValue
    WEBRTC_2002_SECRET = New-RandomValue
    MIDPOINT_ADMIN_PASSWORD = New-RandomValue
    SONAR_ADMIN_PASSWORD = New-RandomValue
    TURN_PASSWORD = New-RandomValue
}

$content = @(
    "APP_ENV=development"
    "JWT_ACCESS_MINUTES=15"
    "TURN_REALM=localhost"
    "TURN_USER=webrtc"
    "ASTERISK_VERSION=22.10.0"
    "HOST_HTTP_PORT=80"
    "HOST_HTTPS_PORT=443"
    "HOST_SIP_UDP_PORT=5060"
    "HOST_SIP_TLS_PORT=5061"
    "HOST_RTP_START=10000"
    "HOST_RTP_END=10100"
    "HOST_TURN_PORT=3478"
    "HOST_TURN_TLS_PORT=5349"
    "HOST_TURN_RELAY_START=49160"
    "HOST_TURN_RELAY_END=49200"
    "HOST_MIDPOINT_PORT=8080"
    "HOST_SONAR_PORT=9000"
)
foreach ($name in $values.Keys | Sort-Object) {
    $content += "$name=$($values[$name])"
}
[IO.File]::WriteAllLines($envPath, $content, [Text.UTF8Encoding]::new($false))

Write-Host "Created .env with random laboratory credentials."
Write-Host "Demo usernames: agente1, agente2, supervisor, adminqa"
Write-Host "Read the generated passwords locally from .env; do not record or commit them."
