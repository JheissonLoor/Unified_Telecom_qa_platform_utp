from datetime import datetime, timezone
from pathlib import Path
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auditing import record_audit
from app.config import get_settings
from app.database import get_db
from app.dependencies import current_user
from app.models import CallDetailRecord, CallSession, User, UserPresence
from app.realtime import event_hub
from app.schemas import (
    CallEventRequest,
    CallPage,
    CallQualityRequest,
    CallView,
    PresenceRequest,
    PresenceView,
    SipConfigView,
)
from app.security import decrypt_secret

router = APIRouter(prefix="/api", tags=["calls"])
RECORDING_ID = re.compile(r"^[A-Za-z0-9._-]{1,150}$")


async def _loaded_user(db: AsyncSession, user: User) -> User | None:
    return await db.scalar(
        select(User).options(selectinload(User.extension)).where(User.id == user.id)
    )


async def _visible_extension(db: AsyncSession, user: User) -> str | None:
    loaded = await _loaded_user(db, user)
    return loaded.extension.number if loaded and loaded.extension else None


def _direction(record: CallDetailRecord, extension: str | None) -> str:
    if extension and record.src == extension:
        return "outgoing"
    if extension and record.dst == extension:
        return "incoming"
    return "internal"


def _matching_session(record: CallDetailRecord, sessions: list[CallSession]) -> CallSession | None:
    candidates = [
        session
        for session in sessions
        if session.source_extension == record.src and session.destination == record.dst
    ]
    if not candidates:
        return None
    reference = record.calldate
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)
    return min(candidates, key=lambda item: abs((item.started_at - reference).total_seconds()))


def _call_view(
    record: CallDetailRecord,
    extension: str | None,
    sessions: list[CallSession],
) -> CallView:
    session = _matching_session(record, sessions)
    recording = Path(get_settings().recordings_dir, f"{record.uniqueid}.wav")
    return CallView(
        id=record.id,
        calldate=record.calldate,
        src=record.src,
        dst=record.dst,
        duration=record.duration,
        billsec=record.billsec,
        disposition=record.disposition,
        uniqueid=record.uniqueid,
        direction=_direction(record, extension),
        media=session.media if session and session.media in {"audio", "video"} else "audio",
        mos=round(session.mos, 2) if session and session.mos is not None else None,
        recording_available=recording.is_file(),
    )


@router.get("/extensions/me/sip-config", response_model=SipConfigView)
async def sip_config(
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    loaded = await _loaded_user(db, user)
    if loaded is None or loaded.extension is None or not loaded.extension.active:
        raise HTTPException(status_code=404, detail="Extension no asignada")
    settings = get_settings()
    await record_audit(
        db,
        actor=user.username,
        action="SIP_CONFIG_READ",
        outcome="SUCCESS",
        source_ip=request.client.host if request.client else None,
        details={"extension": loaded.extension.number},
    )
    return SipConfigView(
        extension=loaded.extension.number,
        authorization_username=loaded.extension.number,
        password=decrypt_secret(loaded.extension.sip_secret_encrypted),
        ice_servers=[
            {"urls": settings.stun_url},
            {
                "urls": [settings.turn_url, settings.turn_tls_url],
                "username": settings.turn_user,
                "credential": settings.turn_password,
            },
        ],
    )


async def _query_calls(
    *,
    user: User,
    db: AsyncSession,
    limit: int,
    offset: int,
    search: str | None,
    disposition: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
) -> tuple[list[CallView], int]:
    extension = await _visible_extension(db, user)
    conditions = []
    if user.role == "AgenteCallCenter":
        if extension is None:
            return [], 0
        conditions.append(or_(CallDetailRecord.src == extension, CallDetailRecord.dst == extension))
    if search:
        value = f"%{search.strip()}%"
        conditions.append(or_(CallDetailRecord.src.ilike(value), CallDetailRecord.dst.ilike(value)))
    if disposition:
        conditions.append(CallDetailRecord.disposition == disposition.upper())
    if date_from:
        conditions.append(CallDetailRecord.calldate >= date_from)
    if date_to:
        conditions.append(CallDetailRecord.calldate <= date_to)

    total = await db.scalar(select(func.count()).select_from(CallDetailRecord).where(*conditions))
    result = await db.scalars(
        select(CallDetailRecord)
        .where(*conditions)
        .order_by(CallDetailRecord.calldate.desc())
        .offset(offset)
        .limit(limit)
    )
    records = list(result)
    sessions = list(
        await db.scalars(select(CallSession).order_by(CallSession.started_at.desc()).limit(500))
    )
    return [_call_view(record, extension, sessions) for record in records], total or 0


@router.get("/calls", response_model=list[CallView])
async def list_calls(
    limit: int = 50,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    limit = max(1, min(limit, 200))
    items, _ = await _query_calls(
        user=user,
        db=db,
        limit=limit,
        offset=0,
        search=None,
        disposition=None,
        date_from=None,
        date_to=None,
    )
    await record_audit(
        db, actor=user.username, action="CALL_REPORT_READ", outcome="SUCCESS", details={"limit": limit}
    )
    return items


@router.get("/calls/page", response_model=CallPage)
async def call_page(
    limit: int = 10,
    offset: int = 0,
    search: str | None = None,
    disposition: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    items, total = await _query_calls(
        user=user,
        db=db,
        limit=limit,
        offset=offset,
        search=search,
        disposition=disposition,
        date_from=date_from,
        date_to=date_to,
    )
    await record_audit(
        db,
        actor=user.username,
        action="CALL_REPORT_FILTER",
        outcome="SUCCESS",
        details={"limit": limit, "offset": offset, "search": search, "disposition": disposition},
    )
    return CallPage(items=items, total=total, limit=limit, offset=offset)


@router.post("/calls/events", status_code=202)
async def call_event(
    payload: CallEventRequest,
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    extension = await _visible_extension(db, user)
    if extension is None:
        raise HTTPException(status_code=409, detail="Extension no asignada")
    session = await db.scalar(select(CallSession).where(CallSession.session_id == payload.session_id))
    now = datetime.now(timezone.utc)
    if session is None:
        session = CallSession(
            session_id=payload.session_id,
            actor=user.username,
            source_extension=extension,
            destination=payload.destination,
            media=payload.media,
            state=payload.event,
            started_at=now,
        )
        db.add(session)
    else:
        session.state = payload.event
        session.media = payload.media
    if payload.event == "answered":
        session.answered_at = now
    if payload.event in {"ended", "failed"}:
        session.ended_at = now
    if payload.event == "held":
        session.held = True
    if payload.event == "resumed":
        session.held = False
    if payload.event == "transferred":
        session.transferred_to = payload.target
    await db.flush()
    await record_audit(
        db,
        actor=user.username,
        action=f"CALL_{payload.event.upper()}",
        outcome="SUCCESS",
        source_ip=request.client.host if request.client else None,
        correlation_id=payload.session_id,
        details={"destination": payload.destination, "media": payload.media, "target": payload.target},
    )
    await event_hub.publish(
        f"call.{payload.event}",
        {
            "actor": user.username,
            "source": extension,
            "destination": payload.destination,
            "media": payload.media,
            "session_id": payload.session_id,
            "target": payload.target,
        },
    )
    return {"accepted": True}


@router.post("/calls/quality", status_code=202)
async def call_quality(
    payload: CallQualityRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await db.scalar(select(CallSession).where(CallSession.session_id == payload.session_id))
    if session is None or session.actor != user.username:
        raise HTTPException(status_code=404, detail="Sesion de llamada no encontrada")
    total_packets = payload.packets_received + payload.packets_lost
    loss_percent = (payload.packets_lost / total_packets * 100) if total_packets else 0
    jitter = payload.jitter_ms or 0
    rtt = payload.rtt_ms or 0
    session.packets_received = payload.packets_received
    session.packets_lost = payload.packets_lost
    session.jitter_ms = payload.jitter_ms
    session.rtt_ms = payload.rtt_ms
    session.bitrate_kbps = payload.bitrate_kbps
    session.mos = max(1.0, min(4.5, 4.5 - loss_percent * 0.12 - jitter * 0.006 - rtt * 0.0015))
    await record_audit(
        db,
        actor=user.username,
        action="CALL_QUALITY_REPORTED",
        outcome="SUCCESS",
        correlation_id=payload.session_id,
        details={"mos": round(session.mos, 2), "packets_lost": payload.packets_lost},
    )
    await event_hub.publish(
        "quality.updated",
        {
            "actor": user.username,
            "session_id": payload.session_id,
            "mos": round(session.mos, 2),
        },
    )
    return {"accepted": True, "mos": round(session.mos, 2)}


@router.get("/presence", response_model=PresenceView)
async def current_presence(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    stored = await db.get(UserPresence, user.id)
    if stored is None:
        return PresenceView(do_not_disturb=False)
    return PresenceView(do_not_disturb=stored.do_not_disturb, updated_at=stored.updated_at)


@router.post("/presence", response_model=PresenceView, status_code=202)
async def presence(
    payload: PresenceRequest,
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    stored = await db.get(UserPresence, user.id)
    if stored is None:
        stored = UserPresence(user_id=user.id, do_not_disturb=payload.do_not_disturb)
        db.add(stored)
    else:
        stored.do_not_disturb = payload.do_not_disturb
    await db.flush()
    await record_audit(
        db,
        actor=user.username,
        action="DND_ENABLED" if payload.do_not_disturb else "DND_DISABLED",
        outcome="SUCCESS",
        source_ip=request.client.host if request.client else None,
    )
    await event_hub.publish(
        "presence.updated",
        {"actor": user.username, "do_not_disturb": stored.do_not_disturb},
    )
    await db.refresh(stored)
    return PresenceView(do_not_disturb=stored.do_not_disturb, updated_at=stored.updated_at)


@router.get("/recordings/{uniqueid}")
async def recording(
    uniqueid: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if not RECORDING_ID.fullmatch(uniqueid):
        raise HTTPException(status_code=400, detail="Identificador de grabacion invalido")
    record = await db.scalar(select(CallDetailRecord).where(CallDetailRecord.uniqueid == uniqueid))
    if record is None:
        raise HTTPException(status_code=404, detail="Llamada no encontrada")
    if user.role == "AgenteCallCenter":
        extension = await _visible_extension(db, user)
        if extension not in {record.src, record.dst}:
            raise HTTPException(status_code=403, detail="Grabacion no autorizada")
    path = Path(get_settings().recordings_dir, f"{uniqueid}.wav")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Grabacion no disponible")
    await record_audit(
        db,
        actor=user.username,
        action="CALL_RECORDING_READ",
        outcome="SUCCESS",
        details={"uniqueid": uniqueid},
    )
    return FileResponse(path, media_type="audio/wav", filename=f"call-{uniqueid}.wav")
