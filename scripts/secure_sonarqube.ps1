$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $root ".env"

if (-not (Test-Path -LiteralPath $envPath)) { throw "Run scripts/bootstrap.ps1 first" }

$lines = [Collections.Generic.List[string]](Get-Content -LiteralPath $envPath)
$existing = $lines | Where-Object { $_ -like "SONAR_ADMIN_PASSWORD=*" } | Select-Object -First 1
$hostPort = (($lines | Where-Object { $_ -like "HOST_SONAR_PORT=*" } | Select-Object -First 1) -split "=", 2)[1]
if (-not $hostPort) { $hostPort = "9000" }

function New-RandomValue([int]$Bytes = 24) {
    $buffer = New-Object byte[] $Bytes
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($buffer).Replace("+", "A").Replace("/", "B").TrimEnd("=")
}

function New-BasicHeader([string]$Password) {
    $value = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin:$Password"))
    return @{ Authorization = "Basic $value" }
}

$baseUrl = "http://localhost:$hostPort"
$credentialReady = $false
if ($existing) {
    $password = ($existing -split "=", 2)[1]
    $validation = Invoke-RestMethod -Uri "$baseUrl/api/authentication/validate" -Headers (New-BasicHeader $password)
    if ($validation.valid) {
        Write-Host "SonarQube administrator already uses the generated local credential."
        $credentialReady = $true
    }
    if (-not $credentialReady) {
        $defaultValidation = Invoke-RestMethod -Uri "$baseUrl/api/authentication/validate" -Headers (New-BasicHeader "admin")
        if (-not $defaultValidation.valid) {
            throw "Neither SONAR_ADMIN_PASSWORD nor the bootstrap credential authenticates"
        }
    }
} else {
    $password = New-RandomValue
}

if (-not $credentialReady) {
    $changeParameters = @{
        Method = "Post"
        Uri = "$baseUrl/api/users/change_password"
        Headers = New-BasicHeader "admin"
        Body = @{ login = "admin"; previousPassword = "admin"; password = $password }
    }
    Invoke-RestMethod @changeParameters | Out-Null
    if (-not $existing) {
        $lines.Add("SONAR_ADMIN_PASSWORD=$password")
        [IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))
    }
    Write-Host "SonarQube administrator secured; the generated password is stored only in .env."
}

$headers = New-BasicHeader $password
$gateName = "Unified Telecom QA Initial Gate"
$gates = (Invoke-RestMethod -Uri "$baseUrl/api/qualitygates/list" -Headers $headers).qualitygates
$gate = $gates | Where-Object { $_.name -eq $gateName } | Select-Object -First 1
if (-not $gate) {
    $gate = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/qualitygates/create" `
        -Headers $headers -Body @{ name = $gateName }
}

$desired = @(
    @{ metric = "coverage"; op = "LT"; error = "80" },
    @{ metric = "reliability_rating"; op = "GT"; error = "1" },
    @{ metric = "security_rating"; op = "GT"; error = "1" },
    @{ metric = "sqale_rating"; op = "GT"; error = "1" },
    @{ metric = "duplicated_lines_density"; op = "GT"; error = "3" }
)
$desiredMetrics = $desired.metric
$current = (Invoke-RestMethod -Uri "$baseUrl/api/qualitygates/show?id=$($gate.id)" -Headers $headers).conditions
foreach ($condition in $current | Where-Object { $_.metric -notin $desiredMetrics }) {
    Invoke-RestMethod -Method Post -Uri "$baseUrl/api/qualitygates/delete_condition" `
        -Headers $headers -Body @{ id = $condition.id } | Out-Null
}
foreach ($condition in $desired) {
    $existingCondition = $current | Where-Object { $_.metric -eq $condition.metric } | Select-Object -First 1
    if ($existingCondition) {
        Invoke-RestMethod -Method Post -Uri "$baseUrl/api/qualitygates/update_condition" `
            -Headers $headers -Body @{
                id = $existingCondition.id
                metric = $condition.metric
                op = $condition.op
                error = $condition.error
            } | Out-Null
    } else {
        Invoke-RestMethod -Method Post -Uri "$baseUrl/api/qualitygates/create_condition" `
            -Headers $headers -Body @{
                gateId = $gate.id
                metric = $condition.metric
                op = $condition.op
                error = $condition.error
            } | Out-Null
    }
}
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/qualitygates/set_as_default" `
    -Headers $headers -Body @{ id = $gate.id } | Out-Null

$project = Invoke-RestMethod -Uri "$baseUrl/api/projects/search?projects=unified-telecom-qa" -Headers $headers
if ($project.components.Count -gt 0) {
    Invoke-RestMethod -Method Post -Uri "$baseUrl/api/qualitygates/select" `
        -Headers $headers -Body @{ gateId = $gate.id; projectKey = "unified-telecom-qa" } | Out-Null
}
Write-Host "SonarQube initial quality gate configured with global coverage >= 80%."
