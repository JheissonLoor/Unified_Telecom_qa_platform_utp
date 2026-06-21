import asyncio
from pathlib import Path
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auditing import record_audit
from app.config import get_settings
from app.database import get_db
from app.dependencies import current_user, require_roles
from app.models import AuditEvent, CallDetailRecord, CallSession, Extension, QualityEvaluation, User
from app.schemas import (
    ActiveCallView,
    AuditView,
    EvaluationCreate,
    EvaluationView,
    ProvisionUserRequest,
    UserAdminView,
    UserStatusRequest,
)
from app.security import decrypt_secret, encrypt_secret, hash_password

router = APIRouter(prefix="/api", tags=["governance"])


@router.get("/audit", response_model=list[AuditView])
async def audit_events(
    limit: int = 100,
    _: User = Depends(require_roles("AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(AuditEvent).order_by(AuditEvent.occurred_at.desc()).limit(min(max(limit, 1), 500))
    )
    return list(result)


@router.get("/metrics/quality")
async def quality_metrics(
    _: User = Depends(require_roles("Supervisor", "AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    users = await db.scalar(select(func.count()).select_from(User))
    calls = await db.scalar(select(func.count()).select_from(CallDetailRecord))
    audits = await db.scalar(select(func.count()).select_from(AuditEvent))
    failed = await db.scalar(
        select(func.count()).select_from(AuditEvent).where(AuditEvent.outcome == "DENIED")
    )
    average_mos = await db.scalar(select(func.avg(CallSession.mos)).where(CallSession.mos.is_not(None)))
    answered = await db.scalar(
        select(func.count()).select_from(CallDetailRecord).where(CallDetailRecord.disposition == "ANSWERED")
    )
    return {
        "users": users or 0,
        "calls": calls or 0,
        "audit_events": audits or 0,
        "denied_events": failed or 0,
        "answered_calls": answered or 0,
        "average_mos": round(float(average_mos), 2) if average_mos is not None else None,
        "quality_gate": "OPTIMAL" if average_mos is None or float(average_mos) >= 3.6 else "REVIEW",
    }


@router.get("/monitoring/active-calls", response_model=list[ActiveCallView])
async def active_calls(
    _: User = Depends(require_roles("Supervisor", "AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(CallSession)
        .where(CallSession.ended_at.is_(None), CallSession.state.not_in(["ended", "failed"]))
        .order_by(CallSession.started_at.desc())
        .limit(100)
    )
    return list(result)


@router.get("/evaluations", response_model=list[EvaluationView])
async def evaluations(
    _: User = Depends(require_roles("Supervisor", "AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    return list(
        await db.scalars(
            select(QualityEvaluation).order_by(QualityEvaluation.created_at.desc()).limit(200)
        )
    )


@router.post("/evaluations", response_model=EvaluationView, status_code=201)
async def create_evaluation(
    payload: EvaluationCreate,
    evaluator: User = Depends(require_roles("Supervisor", "AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    call = await db.get(CallDetailRecord, payload.call_id)
    if call is None:
        raise HTTPException(status_code=404, detail="Llamada no encontrada")
    evaluation = QualityEvaluation(
        call_id=payload.call_id,
        evaluator=evaluator.username,
        score=payload.score,
        notes=payload.notes,
    )
    db.add(evaluation)
    await db.flush()
    await record_audit(
        db,
        actor=evaluator.username,
        action="QUALITY_EVALUATION_CREATED",
        outcome="SUCCESS",
        details={"call_id": payload.call_id, "score": payload.score},
    )
    await db.refresh(evaluation)
    return evaluation


@router.get("/reports/summary")
async def report_summary(
    _: User = Depends(require_roles("Supervisor", "AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    total = await db.scalar(select(func.count()).select_from(CallDetailRecord)) or 0
    answered = await db.scalar(
        select(func.count()).select_from(CallDetailRecord).where(CallDetailRecord.disposition == "ANSWERED")
    ) or 0
    failed = await db.scalar(
        select(func.count()).select_from(CallDetailRecord).where(CallDetailRecord.disposition != "ANSWERED")
    ) or 0
    average_duration = await db.scalar(select(func.avg(CallDetailRecord.billsec)))
    average_mos = await db.scalar(select(func.avg(CallSession.mos)).where(CallSession.mos.is_not(None)))
    return {
        "total_calls": total,
        "answered_calls": answered,
        "failed_calls": failed,
        "answer_rate": round(answered / total * 100, 1) if total else 0,
        "average_duration_seconds": round(float(average_duration or 0), 1),
        "average_mos": round(float(average_mos), 2) if average_mos is not None else None,
    }


@router.get("/users", response_model=list[UserAdminView])
async def users(
    _: User = Depends(require_roles("AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(select(User).order_by(User.username).options(selectinload(User.extension)))
    return [
        UserAdminView(
            username=item.username,
            display_name=item.display_name,
            role=item.role,
            active=item.active,
            extension=item.extension.number if item.extension else None,
            midpoint_oid=item.midpoint_oid,
        )
        for item in result
    ]


@router.patch("/users/{username}/status", response_model=UserAdminView)
async def update_user_status(
    username: str,
    payload: UserStatusRequest,
    administrator: User = Depends(require_roles("AdministradorQA")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(
        select(User).where(User.username == username).options(selectinload(User.extension))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.username == administrator.username and not payload.active:
        raise HTTPException(status_code=409, detail="No puede desactivar su propia cuenta")
    user.active = payload.active
    if user.extension:
        user.extension.active = payload.active
    await record_audit(
        db,
        actor=administrator.username,
        action="USER_STATUS_UPDATED",
        outcome="SUCCESS",
        details={"username": username, "active": payload.active},
    )
    return UserAdminView(
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        active=user.active,
        extension=user.extension.number if user.extension else None,
        midpoint_oid=user.midpoint_oid,
    )


@router.get("/services/status")
async def services_status(
    _: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    database_ok = bool(await db.scalar(select(1)))
    pbx_ok = False
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(settings.asterisk_host, settings.asterisk_http_port), timeout=1.5
        )
        writer.close()
        await writer.wait_closed()
        pbx_ok = True
    except (OSError, TimeoutError):
        pbx_ok = False
    recording_ok = Path(settings.recordings_dir).is_dir()
    return {
        "api": "ok",
        "database": "ok" if database_ok else "error",
        "pbx": "ok" if pbx_ok else "error",
        "recording": "ok" if recording_ok else "error",
        "ivr": "ok" if pbx_ok else "error",
        "network": "ok" if database_ok and pbx_ok else "degraded",
    }


@router.put("/provisioning/users/{username}")
async def provision_user(
    username: str,
    payload: ProvisionUserRequest,
    x_provisioning_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not x_provisioning_token or not secrets.compare_digest(
        x_provisioning_token, get_settings().provisioning_token
    ):
        raise HTTPException(status_code=401, detail="Credencial tecnica invalida")
    if username != payload.username:
        raise HTTPException(status_code=400, detail="Usuario inconsistente")

    user = await db.scalar(select(User).where(User.username == username))
    if user is None:
        temporary = secrets.token_urlsafe(24)
        user = User(
            username=username,
            display_name=payload.display_name,
            password_hash=hash_password(temporary),
            role=payload.role,
            active=payload.active,
            midpoint_oid=payload.midpoint_oid,
        )
        db.add(user)
        await db.flush()
    else:
        user.display_name = payload.display_name
        user.role = payload.role
        user.active = payload.active
        user.midpoint_oid = payload.midpoint_oid

    extension = await db.scalar(select(Extension).where(Extension.number == payload.extension))
    if extension and extension.user_id != user.id:
        raise HTTPException(status_code=409, detail="Extension ya asignada")
    if extension is None:
        sip_secret = secrets.token_urlsafe(24)
        extension = Extension(
            number=payload.extension,
            user_id=user.id,
            sip_secret_encrypted=encrypt_secret(sip_secret),
            active=payload.active,
        )
        db.add(extension)
    else:
        extension.active = payload.active
        sip_secret = decrypt_secret(extension.sip_secret_encrypted)
    await db.commit()
    await record_audit(
        db,
        actor="midpoint-sync",
        action="IDENTITY_PROVISION",
        outcome="SUCCESS",
        details={"username": username, "extension": payload.extension, "role": payload.role},
    )
    return {
        "username": username,
        "extension": payload.extension,
        "sip_secret": sip_secret,
        "status": "provisioned",
    }
