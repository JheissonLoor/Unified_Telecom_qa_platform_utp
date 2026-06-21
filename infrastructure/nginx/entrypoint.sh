#!/bin/sh
set -eu

mkdir -p /etc/nginx/certs
if [ ! -s /etc/nginx/certs/cert.pem ] || [ ! -s /etc/nginx/certs/key.pem ]; then
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 30 \
    -keyout /etc/nginx/certs/key.pem -out /etc/nginx/certs/cert.pem \
    -subj "/CN=localhost/O=Unified Telecom QA/C=PE" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  chmod 0600 /etc/nginx/certs/key.pem
fi

exec nginx -g 'daemon off;'
