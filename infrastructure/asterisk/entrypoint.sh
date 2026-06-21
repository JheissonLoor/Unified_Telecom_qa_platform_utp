#!/bin/sh
set -eu

required="POSTGRES_PASSWORD SIP_1001_SECRET SIP_1002_SECRET WEBRTC_2001_SECRET WEBRTC_2002_SECRET"
for name in $required; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

ASTERISK_NAT_OPTIONS=""
if [ -n "${ASTERISK_EXTERNAL_ADDRESS:-}" ]; then
  if [ -z "${ASTERISK_LOCAL_NET:-}" ]; then
    echo "ASTERISK_LOCAL_NET is required when ASTERISK_EXTERNAL_ADDRESS is set" >&2
    exit 1
  fi
  ASTERISK_NAT_OPTIONS="external_media_address=${ASTERISK_EXTERNAL_ADDRESS}
external_signaling_address=${ASTERISK_EXTERNAL_ADDRESS}
external_signaling_port=${HOST_SIP_UDP_PORT:-5060}
local_net=${ASTERISK_LOCAL_NET}"
fi
export ASTERISK_NAT_OPTIONS

mkdir -p /etc/asterisk/certs /var/run/asterisk /var/log/asterisk /var/spool/asterisk
mkdir -p /etc/asterisk/generated
touch /etc/asterisk/generated/midpoint_endpoints.conf
if [ ! -s /etc/asterisk/certs/asterisk.crt ] || [ ! -s /etc/asterisk/certs/asterisk.key ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout /etc/asterisk/certs/asterisk.key \
    -out /etc/asterisk/certs/asterisk.crt \
    -subj "/CN=localhost/O=Unified Telecom QA/C=PE" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi

for template in /etc/asterisk/templates/*.template; do
  target="/etc/asterisk/$(basename "$template" .template)"
  envsubst < "$template" > "$target"
done
cp /etc/asterisk/templates/*.conf /etc/asterisk/

chmod 0600 /etc/asterisk/pjsip.conf /etc/asterisk/res_odbc.conf /etc/asterisk/certs/asterisk.key

exec asterisk -f -vvv
