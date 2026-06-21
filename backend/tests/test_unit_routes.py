from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
import pytest

from app.models import CallDetailRecord, CallSession, Extension, User
from app.routers import auth as auth_router
from app.routers import calls, governance
from app.schemas import CallEventRequest, CallQualityRequest, LoginRequest


class FakeDb:
    def __init__(self, scalar_values=None):
        self.scalar_values = list(scalar_values or [])
        self.added = []

    async def scalar(self, _statement):
        return self.scalar_values.pop(0) if self.scalar_values else None

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def refresh(self, _value):
        return None


def make_user(with_extension=True):
    user = User(
        id=1,
        username="agente1",
        display_name="Agente Uno",
        password_hash="hash",
        role="AgenteCallCenter",
        active=True,
    )
    if with_extension:
        user.extension = Extension(
            id=1,
            number="2001",
            user_id=1,
            sip_secret_encrypted="secret",
            active=True,
        )
    return user


def request():
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/",
        "headers": [],
        "client": ("127.0.0.1", 12345),
    })


def test_call_helpers_build_direction_session_and_view():
    now = datetime.now(timezone.utc)
    record = CallDetailRecord(
        id=4,
        calldate=now.replace(tzinfo=None),
        src="2001",
        dst="2002",
        duration=60,
        billsec=55,
        disposition="ANSWERED",
        uniqueid="unit-cdr",
    )
    close = CallSession(
        session_id="session-close",
        actor="agente1",
        source_extension="2001",
        destination="2002",
        media="video",
        state="ended",
        started_at=now + timedelta(seconds=2),
        mos=4.234,
    )
    far = CallSession(
        session_id="session-far",
        actor="agente1",
        source_extension="2001",
        destination="2002",
        media="audio",
        state="ended",
        started_at=now + timedelta(minutes=5),
    )

    assert calls._direction(record, "2001") == "outgoing"
    assert calls._direction(record, "2002") == "incoming"
    assert calls._direction(record, None) == "internal"
    assert calls._matching_session(record, []) is None
    assert calls._matching_session(record, [far, close]) is close
    view = calls._call_view(record, "2001", [far, close])
    assert view.media == "video"
    assert view.mos == 4.23
    assert view.recording_available is False


@pytest.mark.asyncio
async def test_direct_call_events_and_quality_cover_state_transitions():
    user = make_user()
    session = CallSession(
        session_id="unit-session",
        actor=user.username,
        source_extension="2001",
        destination="2002",
        media="audio",
        state="started",
        started_at=datetime.now(timezone.utc),
    )
    for event, target in [
        ("answered", None),
        ("held", None),
        ("resumed", None),
        ("transferred", "2003"),
        ("failed", None),
    ]:
        db = FakeDb([user, session])
        result = await calls.call_event(
            CallEventRequest(
                event=event,
                destination="2002",
                media="audio",
                session_id="unit-session",
                target=target,
            ),
            request(),
            user,
            db,
        )
        assert result == {"accepted": True}
    assert session.answered_at is not None
    assert session.ended_at is not None
    assert session.held is False
    assert session.transferred_to == "2003"

    new_db = FakeDb([user, None])
    await calls.call_event(
        CallEventRequest(
            event="started",
            destination="2002",
            media="video",
            session_id="new-unit-session",
        ),
        request(),
        user,
        new_db,
    )
    assert any(isinstance(value, CallSession) for value in new_db.added)

    quality_db = FakeDb([session])
    quality = await calls.call_quality(
        CallQualityRequest(
            session_id="unit-session",
            packets_received=100,
            packets_lost=5,
            jitter_ms=10,
            rtt_ms=50,
            bitrate_kbps=80,
        ),
        user,
        quality_db,
    )
    assert 1 <= quality["mos"] < 4.5

    with pytest.raises(HTTPException) as missing:
        await calls.call_quality(
            CallQualityRequest(
                session_id="missing-session",
                packets_received=0,
                packets_lost=0,
                jitter_ms=None,
                rtt_ms=None,
                bitrate_kbps=None,
            ),
            user,
            FakeDb([None]),
        )
    assert missing.value.status_code == 404


@pytest.mark.asyncio
async def test_direct_authentication_and_report_summary(monkeypatch):
    user = make_user()
    assert auth_router.user_view(user).extension == "2001"
    assert auth_router.user_view(make_user(False)).extension is None

    monkeypatch.setattr(auth_router, "verify_password", lambda *_: True)
    response = await auth_router.login(
        LoginRequest(username="agente1", password="correct1"),
        request(),
        FakeDb([user]),
    )
    assert response.user.username == "agente1"
    assert response.access_token

    monkeypatch.setattr(auth_router, "verify_password", lambda *_: False)
    with pytest.raises(HTTPException) as denied:
        await auth_router.login(
            LoginRequest(username="agente1", password="wrongpass"),
            request(),
            FakeDb([user]),
        )
    assert denied.value.status_code == 401

    summary = await governance.report_summary(
        user,
        FakeDb([10, 8, 2, 42.25, 4.123]),
    )
    assert summary == {
        "total_calls": 10,
        "answered_calls": 8,
        "failed_calls": 2,
        "answer_rate": 80.0,
        "average_duration_seconds": 42.2,
        "average_mos": 4.12,
    }
