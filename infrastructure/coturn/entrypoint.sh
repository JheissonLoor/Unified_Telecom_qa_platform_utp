#!/bin/sh
set -eu

mkdir -p /etc/coturn/certs
if [ ! -s /etc/coturn/certs/cert.pem ] || [ ! -s /etc/coturn/certs/key.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout /etc/coturn/certs/key.pem -out /etc/coturn/certs/cert.pem \
    -subj "/CN=localhost/O=Unified Telecom QA/C=PE"
fi

sed \
  -e "s|__TURN_REALM__|${TURN_REALM}|g" \
  -e "s|__TURN_USER__|${TURN_USER}|g" \
  -e "s|__TURN_PASSWORD__|${TURN_PASSWORD}|g" \
  /etc/coturn/turnserver.conf.template > /tmp/turnserver.conf

exec turnserver -c /tmp/turnserver.conf
