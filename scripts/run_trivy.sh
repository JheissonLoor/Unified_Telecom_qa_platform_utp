#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$ROOT/reports/trivy"
docker run --rm -v "$ROOT:/workspace" aquasec/trivy:0.65.0 fs \
  --scanners vuln,secret,misconfig --severity HIGH,CRITICAL \
  --skip-dirs /workspace/.git --skip-dirs /workspace/.venv \
  --skip-dirs /workspace/frontend/node_modules \
  --skip-dirs /workspace/frontend/coverage \
  --skip-dirs /workspace/frontend/dist --skip-dirs /workspace/reports \
  --format json --output /workspace/reports/trivy/filesystem.json /workspace
