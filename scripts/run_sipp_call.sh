#!/usr/bin/env bash
set -euo pipefail

ip=$(hostname -i | awk '{print $1}')
perl -pe 's/__SIP_1001_SECRET__/$ENV{SIP_1001_SECRET}/g' /scenarios/sipp-uac-1001.xml > /tmp/uac.xml

cleanup() {
    rm -f /tmp/uac.xml
}
trap cleanup EXIT

sipp asterisk:5060 \
    -sf /tmp/uac.xml \
    -i "$ip" -p 5064 -m 1 \
    -rtp_echo -mp 6000 \
    -timeout 25s -timeout_error -trace_err \
    -error_file /results/uac-errors.log \
    > /results/uac-output.log 2>&1
