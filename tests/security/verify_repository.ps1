$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

$privateKeys = Get-ChildItem -Path $root -Recurse -File |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]|[\\/]node_modules[\\/]|[\\/]\.venv[\\/]' } |
    Select-String -Pattern '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
if ($privateKeys) { throw "Private key material detected" }

$trackedEnv = git -C $root ls-files .env
if ($trackedEnv) { throw ".env must not be tracked" }

docker compose -f (Join-Path $root "docker-compose.yml") config --quiet
Write-Host "Repository security checks passed."
