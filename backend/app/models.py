from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(40), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    midpoint_oid: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    extension: Mapped["Extension | None"] = relationship(back_populates="user", uselist=False)


class UserPresence(Base):
    __tablename__ = "user_presence"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    do_not_disturb: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Extension(Base):
    __tablename__ = "extensions"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    sip_secret_encrypted: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped[User] = relationship(back_populates="extension")


class CallDetailRecord(Base):
    __tablename__ = "call_detail_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    calldate: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    clid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    src: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    dst: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    dcontext: Mapped[str | None] = mapped_column(String(80), nullable=True)
    channel: Mapped[str | None] = mapped_column(String(160), nullable=True)
    dstchannel: Mapped[str | None] = mapped_column(String(160), nullable=True)
    lastapp: Mapped[str | None] = mapped_column(String(80), nullable=True)
    lastdata: Mapped[str | None] = mapped_column(String(160), nullable=True)
    duration: Mapped[int] = mapped_column(Integer, default=0)
    billsec: Mapped[int] = mapped_column(Integer, default=0)
    disposition: Mapped[str | None] = mapped_column(String(45), index=True, nullable=True)
    amaflags: Mapped[int] = mapped_column(Integer, default=0)
    accountcode: Mapped[str | None] = mapped_column(String(80), nullable=True)
    uniqueid: Mapped[str] = mapped_column(String(150), unique=True)
    userfield: Mapped[str | None] = mapped_column(String(255), nullable=True)
    peeraccount: Mapped[str | None] = mapped_column(String(80), nullable=True)
    linkedid: Mapped[str | None] = mapped_column(String(150), index=True, nullable=True)
    sequence: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )
    actor: Mapped[str] = mapped_column(String(80), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    outcome: Mapped[str] = mapped_column(String(24), index=True)
    source_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    correlation_id: Mapped[str] = mapped_column(String(64), index=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class CallSession(Base):
    __tablename__ = "call_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    actor: Mapped[str] = mapped_column(String(80), index=True)
    source_extension: Mapped[str] = mapped_column(String(16), index=True)
    destination: Mapped[str] = mapped_column(String(16), index=True)
    media: Mapped[str] = mapped_column(String(12), default="audio")
    state: Mapped[str] = mapped_column(String(24), default="started", index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    held: Mapped[bool] = mapped_column(Boolean, default=False)
    transferred_to: Mapped[str | None] = mapped_column(String(16), nullable=True)
    packets_received: Mapped[int] = mapped_column(Integer, default=0)
    packets_lost: Mapped[int] = mapped_column(Integer, default=0)
    jitter_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    rtt_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    bitrate_kbps: Mapped[float | None] = mapped_column(Float, nullable=True)
    mos: Mapped[float | None] = mapped_column(Float, nullable=True)


class QualityEvaluation(Base):
    __tablename__ = "quality_evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    call_id: Mapped[int] = mapped_column(ForeignKey("call_detail_records.id"), index=True)
    evaluator: Mapped[str] = mapped_column(String(80), index=True)
    score: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
