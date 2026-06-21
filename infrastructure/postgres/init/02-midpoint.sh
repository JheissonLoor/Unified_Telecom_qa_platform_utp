#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=midpoint_password="$MIDPOINT_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE midpoint LOGIN SUPERUSER PASSWORD %L', :'midpoint_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'midpoint')\gexec
SELECT 'CREATE DATABASE midpoint OWNER midpoint'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'midpoint')\gexec
SQL
