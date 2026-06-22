import asyncio
from uuid import uuid4

import asyncpg
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.security import create_access_token


def login(client: TestClient, username: str, password: str) -> str:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def cleanup_provisioning_fixtures() -> None:
    settings = get_settings()
    connection = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))
    try:
        async with connection.transaction():
            extensions = ["2997", "2998"]
            await connection.execute(
                "DELETE FROM audit_events WHERE action = 'IDENTITY_PROVISION' "
                "AND details->>'extension' = ANY($1::text[])",
                extensions,
            )
            await connection.execute(
                "DELETE FROM extensions WHERE number = ANY($1::text[])",
                extensions,
            )
            await connection.execute(
                "DELETE FROM users WHERE midpoint_oid LIKE 'oid-%' "
                "OR midpoint_oid LIKE 'inactive-%' OR midpoint_oid LIKE 'conflict-%'"
            )
    finally:
        await connection.close()


async def create_evaluation_call(uniqueid: str) -> int:
    settings = get_settings()
    connection = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))
    try:
        return await connection.fetchval(
            "INSERT INTO call_detail_records (calldate, src, dst, duration, billsec, "
            "disposition, amaflags, uniqueid) VALUES (CURRENT_TIMESTAMP, '2001', '2002', "
            "60, 55, 'ANSWERED', 0, $1) RETURNING id",
            uniqueid,
        )
    finally:
        await connection.close()


async def cleanup_evaluation_call(uniqueid: str) -> None:
    settings = get_settings()
    connection = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))
    try:
        await connection.execute(
            "DELETE FROM quality_evaluations WHERE call_id IN "
            "(SELECT id FROM call_detail_records WHERE uniqueid = $1)",
            uniqueid,
        )
        await connection.execute("DELETE FROM call_detail_records WHERE uniqueid = $1", uniqueid)
    finally:
        await connection.close()


async def cleanup_call_sessions(session_ids: list[str]) -> None:
    settings = get_settings()
    connection = await asyncpg.connect(settings.database_url.replace("+asyncpg", ""))
    try:
        await connection.execute(
            "DELETE FROM audit_events WHERE correlation_id = ANY($1::text[])", session_ids
        )
        await connection.execute(
            "DELETE FROM call_sessions WHERE session_id = ANY($1::text[])", session_ids
        )
    finally:
        await connection.close()


def test_health_authentication_calls_and_governance():
    settings = get_settings()

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.json() == {"status": "ok", "service": "backend"}

        assert client.get("/api/auth/me").status_code == 401
        assert client.get("/api/auth/me", headers=auth("invalid-token")).status_code == 401

        denied = client.post(
            "/api/auth/login",
            json={"username": "agente1", "password": "invalid-password"},
        )
        assert denied.status_code == 401

        agent_token = login(client, "agente1", settings.demo_agent_password)
        supervisor_token = login(client, "supervisor", settings.demo_supervisor_password)
        admin_token = login(client, "adminqa", settings.demo_admin_password)

        me = client.get("/api/auth/me", headers=auth(agent_token))
        assert me.status_code == 200
        assert me.json()["extension"] == "2001"

        sip = client.get("/api/extensions/me/sip-config", headers=auth(agent_token))
        assert sip.status_code == 200
        assert sip.json()["extension"] == "2001"
        assert sip.json()["password"] == settings.webrtc_2001_secret
        assert len(sip.json()["ice_servers"]) == 2

        no_extension = client.get(
            "/api/extensions/me/sip-config", headers=auth(supervisor_token)
        )
        assert no_extension.status_code == 404

        agent_calls = client.get("/api/calls?limit=999", headers=auth(agent_token))
        supervisor_calls = client.get(
            "/api/calls?limit=0", headers=auth(supervisor_token)
        )
        assert agent_calls.status_code == 200
        assert supervisor_calls.status_code == 200
        assert isinstance(agent_calls.json(), list)

        page = client.get(
            "/api/calls/page?limit=10&offset=0&search=200",
            headers=auth(agent_token),
        )
        assert page.status_code == 200
        assert page.json()["limit"] == 10
        assert "items" in page.json()

        session_id = f"pytest-{uuid4()}"
        event = client.post(
            "/api/calls/events",
            headers=auth(agent_token),
            json={
                "event": "answered",
                "destination": "2002",
                "media": "audio",
                "session_id": session_id,
            },
        )
        assert event.status_code == 202
        assert event.json() == {"accepted": True}

        quality_report = client.post(
            "/api/calls/quality",
            headers=auth(agent_token),
            json={
                "session_id": session_id,
                "packets_received": 1000,
                "packets_lost": 2,
                "jitter_ms": 4.5,
                "rtt_ms": 35,
                "bitrate_kbps": 80,
            },
        )
        assert quality_report.status_code == 202
        assert 1 <= quality_report.json()["mos"] <= 4.5

        presence = client.post(
            "/api/presence", headers=auth(agent_token), json={"do_not_disturb": True}
        )
        assert presence.status_code == 202
        assert presence.json()["do_not_disturb"] is True
        stored_presence = client.get("/api/presence", headers=auth(agent_token))
        assert stored_presence.status_code == 200
        assert stored_presence.json()["do_not_disturb"] is True

        ended = client.post(
            "/api/calls/events",
            headers=auth(agent_token),
            json={
                "event": "ended",
                "destination": "2002",
                "media": "audio",
                "session_id": session_id,
            },
        )
        assert ended.status_code == 202

        assert client.get("/api/audit", headers=auth(agent_token)).status_code == 403
        assert client.get("/api/metrics/quality", headers=auth(agent_token)).status_code == 403
        audit = client.get("/api/audit?limit=999", headers=auth(admin_token))
        metrics = client.get("/api/metrics/quality", headers=auth(admin_token))
        supervisor_metrics = client.get("/api/metrics/quality", headers=auth(supervisor_token))
        active = client.get("/api/monitoring/active-calls", headers=auth(supervisor_token))
        reports = client.get("/api/reports/summary", headers=auth(supervisor_token))
        report_pdf = client.get("/api/reports/summary.pdf", headers=auth(supervisor_token))
        services = client.get("/api/services/status", headers=auth(agent_token))
        quality_summary = client.get("/api/metrics/quality-summary", headers=auth(agent_token))
        users = client.get("/api/users", headers=auth(admin_token))
        assert audit.status_code == 200
        assert len(audit.json()) > 0
        assert metrics.status_code == 200
        assert supervisor_metrics.status_code == 200
        assert active.status_code == 200
        assert reports.status_code == 200
        assert report_pdf.status_code == 200
        assert report_pdf.headers["content-type"] == "application/pdf"
        assert report_pdf.content.startswith(b"%PDF")
        assert services.status_code == 200
        assert quality_summary.status_code == 200
        assert quality_summary.json()["measured_calls"] >= 1
        assert services.json()["api"] == "ok"
        assert users.status_code == 200
        assert len(users.json()) >= 4
        assert metrics.json()["users"] >= 4
        assert metrics.json()["audit_events"] > 0

        with client.websocket_connect("/api/events/ws") as websocket:
            websocket.send_json({"token": agent_token})
            ready = websocket.receive_json()
            assert ready["type"] == "ready"
            assert ready["data"]["username"] == "agente1"

        self_disable = client.patch(
            "/api/users/adminqa/status",
            headers=auth(admin_token),
            json={"active": False},
        )
        assert self_disable.status_code == 409


def test_provisioning_create_update_and_validation():
    settings = get_settings()
    suffix = uuid4().hex[:10]
    username = f"qa-{suffix}"
    inactive_username = f"off-{suffix}"
    payload = {
        "midpoint_oid": f"oid-{suffix}",
        "username": username,
        "display_name": "QA Coverage User",
        "role": "AgenteCallCenter",
        "extension": "2998",
        "active": True,
    }
    technical_auth = {"X-Provisioning-Token": settings.provisioning_token}

    asyncio.run(cleanup_provisioning_fixtures())
    try:
        with TestClient(app) as client:
            assert client.put(f"/api/provisioning/users/{username}", json=payload).status_code == 401

            mismatch = client.put(
                "/api/provisioning/users/different-user",
                headers=technical_auth,
                json=payload,
            )
            assert mismatch.status_code == 400

            created = client.put(
                f"/api/provisioning/users/{username}",
                headers=technical_auth,
                json=payload,
            )
            assert created.status_code == 200, created.text
            secret = created.json()["sip_secret"]
            assert secret

            payload["display_name"] = "QA Coverage Updated"
            updated = client.put(
                f"/api/provisioning/users/{username}",
                headers=technical_auth,
                json=payload,
            )
            assert updated.status_code == 200
            assert updated.json()["sip_secret"] == secret

            conflict_payload = {
                **payload,
                "midpoint_oid": f"conflict-{suffix}",
                "username": f"conflict-{suffix}",
            }
            conflict = client.put(
                f"/api/provisioning/users/{conflict_payload['username']}",
                headers=technical_auth,
                json=conflict_payload,
            )
            assert conflict.status_code == 409

            inactive_payload = {
                **payload,
                "midpoint_oid": f"inactive-{suffix}",
                "username": inactive_username,
                "extension": "2997",
                "active": False,
            }
            inactive = client.put(
                f"/api/provisioning/users/{inactive_username}",
                headers=technical_auth,
                json=inactive_payload,
            )
            assert inactive.status_code == 200
            inactive_token, _ = create_access_token(inactive_username, "AgenteCallCenter")
            assert client.get("/api/auth/me", headers=auth(inactive_token)).status_code == 401

            ghost_token, _ = create_access_token(f"ghost-{suffix}", "AgenteCallCenter")
            assert client.get("/api/auth/me", headers=auth(ghost_token)).status_code == 401
    finally:
        asyncio.run(cleanup_provisioning_fixtures())


def test_supervisor_creates_quality_evaluation():
    settings = get_settings()
    uniqueid = f"pytest-eval-{uuid4()}"
    call_id = asyncio.run(create_evaluation_call(uniqueid))
    try:
        with TestClient(app) as client:
            supervisor_token = login(client, "supervisor", settings.demo_supervisor_password)
            created = client.post(
                "/api/evaluations",
                headers=auth(supervisor_token),
                json={"call_id": call_id, "score": 94, "notes": "Validacion automatizada QA"},
            )
            assert created.status_code == 201, created.text
            assert created.json()["score"] == 94
            listed = client.get("/api/evaluations", headers=auth(supervisor_token))
            assert listed.status_code == 200
            assert any(item["call_id"] == call_id for item in listed.json())
    finally:
        asyncio.run(cleanup_evaluation_call(uniqueid))


def test_call_lifecycle_filters_recordings_and_administration():
    settings = get_settings()
    session_id = f"pytest-lifecycle-{uuid4()}"
    unknown_session = f"pytest-unknown-{uuid4()}"
    headers: dict[str, str]
    try:
        with TestClient(app) as client:
            agent_token = login(client, "agente1", settings.demo_agent_password)
            supervisor_token = login(client, "supervisor", settings.demo_supervisor_password)
            admin_token = login(client, "adminqa", settings.demo_admin_password)
            headers = auth(agent_token)

            no_extension = client.post(
                "/api/calls/events",
                headers=auth(supervisor_token),
                json={
                    "event": "started",
                    "destination": "2002",
                    "media": "audio",
                    "session_id": session_id,
                },
            )
            assert no_extension.status_code == 409

            for event, target in [
                ("started", None),
                ("held", None),
                ("resumed", None),
                ("transferred", "2003"),
                ("conference", "700"),
            ]:
                response = client.post(
                    "/api/calls/events",
                    headers=headers,
                    json={
                        "event": event,
                        "destination": "2002",
                        "media": "video" if event == "started" else "audio",
                        "session_id": session_id,
                        "target": target,
                    },
                )
                assert response.status_code == 202, response.text

            active = client.get(
                "/api/monitoring/active-calls", headers=auth(supervisor_token)
            )
            assert active.status_code == 200
            assert any(item["session_id"] == session_id for item in active.json())

            missing_quality = client.post(
                "/api/calls/quality",
                headers=headers,
                json={
                    "session_id": unknown_session,
                    "packets_received": 0,
                    "packets_lost": 0,
                    "jitter_ms": None,
                    "rtt_ms": None,
                    "bitrate_kbps": None,
                },
            )
            assert missing_quality.status_code == 404

            quality = client.post(
                "/api/calls/quality",
                headers=headers,
                json={
                    "session_id": session_id,
                    "packets_received": 0,
                    "packets_lost": 0,
                    "jitter_ms": None,
                    "rtt_ms": None,
                    "bitrate_kbps": None,
                },
            )
            assert quality.status_code == 202
            assert quality.json()["mos"] == 4.5

            ended = client.post(
                "/api/calls/events",
                headers=headers,
                json={
                    "event": "failed",
                    "destination": "2002",
                    "media": "audio",
                    "session_id": session_id,
                },
            )
            assert ended.status_code == 202
            active_after = client.get(
                "/api/monitoring/active-calls", headers=auth(supervisor_token)
            )
            assert all(item["session_id"] != session_id for item in active_after.json())

            dnd_off = client.post(
                "/api/presence", headers=headers, json={"do_not_disturb": False}
            )
            assert dnd_off.status_code == 202
            assert dnd_off.json()["do_not_disturb"] is False

            filtered = client.get(
                "/api/calls/page?limit=200&offset=-4&disposition=answered"
                "&date_from=2020-01-01T00:00:00Z&date_to=2030-01-01T00:00:00Z",
                headers=headers,
            )
            assert filtered.status_code == 200
            assert filtered.json()["limit"] == 100
            assert filtered.json()["offset"] == 0

            assert client.get("/api/recordings/bad%2Fid", headers=headers).status_code in {400, 404}
            assert client.get(
                f"/api/recordings/not-found-{uuid4().hex}", headers=headers
            ).status_code == 404
            assert client.post(
                "/api/evaluations",
                headers=auth(supervisor_token),
                json={"call_id": 2147483647, "score": 80, "notes": "missing"},
            ).status_code == 404
            assert client.patch(
                "/api/users/usuario-inexistente/status",
                headers=auth(admin_token),
                json={"active": False},
            ).status_code == 404

            disabled = client.patch(
                "/api/users/agente2/status",
                headers=auth(admin_token),
                json={"active": False},
            )
            assert disabled.status_code == 200
            assert disabled.json()["active"] is False
            enabled = client.patch(
                "/api/users/agente2/status",
                headers=auth(admin_token),
                json={"active": True},
            )
            assert enabled.status_code == 200
            assert enabled.json()["active"] is True
    finally:
        asyncio.run(cleanup_call_sessions([session_id, unknown_session]))
