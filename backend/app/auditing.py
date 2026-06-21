from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditEvent


async def record_audit(
    db: AsyncSession,
    *,
    actor: str,
    action: str,
    outcome: str,
    source_ip: str | None = None,
    correlation_id: str | None = None,
    details: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        actor=actor,
        action=action,
        outcome=outcome,
        source_ip=source_ip,
        correlation_id=correlation_id or str(uuid4()),
        details=details or {},
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event
