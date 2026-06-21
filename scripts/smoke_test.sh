#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
set -a
. "$ROOT/.env"
set +a

for service in postgres backend frontend asterisk coturn midpoint nginx; do
  docker compose ps --services --filter status=running | grep -qx "$service" || {
    echo "Service not running: $service" >&2
    exit 1
  }
done

curl -kfsS "https://localhost:${HOST_HTTPS_PORT:-443}/health" >/dev/null
docker compose exec -T asterisk asterisk -rx "core waitfullybooted"
docker compose exec -T asterisk asterisk -rx "pjsip show endpoints"
docker compose exec -T postgres pg_isready -U telecom_app -d telecom_qa
echo "Smoke test completed: https://localhost:${HOST_HTTPS_PORT:-443}"
