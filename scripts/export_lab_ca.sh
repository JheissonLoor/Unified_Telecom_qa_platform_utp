#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DESTINATION="$ROOT/infrastructure/certificates/generated/nginx-cert.pem"
mkdir -p "$(dirname "$DESTINATION")"
docker compose -f "$ROOT/docker-compose.yml" cp \
  nginx:/etc/nginx/certs/cert.pem "$DESTINATION"
echo "Laboratory CA exported to infrastructure/certificates/generated/nginx-cert.pem"
