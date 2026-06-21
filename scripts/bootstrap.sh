#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="$ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  echo ".env already exists; no values were replaced."
  exit 0
fi

random_value() { openssl rand -hex 24; }
fernet_key() { openssl rand -base64 32 | tr '+/' '-_' | tr -d '\n'; }

cat > "$ENV_FILE" <<EOF
APP_ENV=development
JWT_ACCESS_MINUTES=15
TURN_REALM=localhost
TURN_USER=webrtc
ASTERISK_VERSION=22.10.0
HOST_HTTP_PORT=80
HOST_HTTPS_PORT=443
HOST_SIP_UDP_PORT=5060
HOST_SIP_TLS_PORT=5061
HOST_RTP_START=10000
HOST_RTP_END=10100
HOST_TURN_PORT=3478
HOST_TURN_TLS_PORT=5349
HOST_TURN_RELAY_START=49160
HOST_TURN_RELAY_END=49200
HOST_MIDPOINT_PORT=8080
HOST_SONAR_PORT=9000
POSTGRES_PASSWORD=$(random_value)
MIDPOINT_DB_PASSWORD=$(random_value)
JWT_SECRET=$(openssl rand -hex 48)
APP_ENCRYPTION_KEY=$(fernet_key)
PROVISIONING_TOKEN=$(openssl rand -hex 48)
DEMO_AGENT_PASSWORD=$(random_value)
DEMO_AGENT2_PASSWORD=$(random_value)
DEMO_SUPERVISOR_PASSWORD=$(random_value)
DEMO_ADMIN_PASSWORD=$(random_value)
SIP_1001_SECRET=$(random_value)
SIP_1002_SECRET=$(random_value)
WEBRTC_2001_SECRET=$(random_value)
WEBRTC_2002_SECRET=$(random_value)
MIDPOINT_ADMIN_PASSWORD=$(random_value)
TURN_PASSWORD=$(random_value)
EOF
chmod 0600 "$ENV_FILE"
echo "Created .env with random laboratory credentials."
