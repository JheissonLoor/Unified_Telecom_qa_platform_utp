import os

import httpx
import pytest


BASE_URL = os.getenv("TEST_BASE_URL", "https://localhost")


@pytest.mark.integration
def test_health_and_openapi_contract():
    try:
        with httpx.Client(base_url=BASE_URL, verify=False, timeout=5) as client:
            assert client.get("/health").status_code == 200
            schema = client.get("/openapi.json")
    except httpx.ConnectError:
        pytest.skip("Integrated stack is not running")
    assert schema.status_code == 200
    paths = schema.json()["paths"]
    assert "/api/auth/login" in paths
    assert "/api/calls" in paths
    assert "/api/calls/page" in paths
    assert "/api/calls/quality" in paths
    assert "/api/recordings/{uniqueid}" in paths
    assert "/api/services/status" in paths
    assert "/api/monitoring/active-calls" in paths
    assert "/api/evaluations" in paths
    assert "/api/reports/summary" in paths
    assert "/api/users" in paths
    assert "/api/audit" in paths
    assert "/api/provisioning/users/{username}" in paths
