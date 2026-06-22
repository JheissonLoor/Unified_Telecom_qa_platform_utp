from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["AgenteCallCenter", "Supervisor", "AdministradorQA"]


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=256)


class UserView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    display_name: str
    role: Role
    active: bool
    extension: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserView


class SipConfigView(BaseModel):
    extension: str
    authorization_username: str
    password: str
    websocket_url: str = "wss://localhost/ws"
    sip_domain: str = "localhost"
    ice_servers: list[dict[str, str | list[str]]]


class CallView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    calldate: datetime
    src: str | None
    dst: str | None
    duration: int
    billsec: int
    disposition: str | None
    uniqueid: str
    direction: Literal["incoming", "outgoing", "internal"] = "internal"
    media: Literal["audio", "video"] = "audio"
    mos: float | None = None
    recording_available: bool = False


class CallPage(BaseModel):
    items: list[CallView]
    total: int
    limit: int
    offset: int


class CallEventRequest(BaseModel):
    event: Literal[
        "started", "answered", "ended", "failed", "held", "resumed", "transferred", "conference"
    ]
    destination: str = Field(pattern=r"^[0-9]{3,16}$")
    media: Literal["audio", "video"]
    session_id: str = Field(min_length=6, max_length=128)
    target: str | None = Field(default=None, pattern=r"^[0-9]{3,16}$")


class CallQualityRequest(BaseModel):
    session_id: str = Field(min_length=6, max_length=128)
    packets_received: int = Field(default=0, ge=0)
    packets_lost: int = Field(default=0, ge=0)
    jitter_ms: float | None = Field(default=None, ge=0, le=60000)
    rtt_ms: float | None = Field(default=None, ge=0, le=60000)
    bitrate_kbps: float | None = Field(default=None, ge=0)


class PresenceRequest(BaseModel):
    do_not_disturb: bool


class PresenceView(BaseModel):
    do_not_disturb: bool
    updated_at: datetime | None = None


class UserAdminView(UserView):
    midpoint_oid: str | None = None


class UserStatusRequest(BaseModel):
    active: bool


class EvaluationCreate(BaseModel):
    call_id: int = Field(gt=0)
    score: int = Field(ge=1, le=100)
    notes: str = Field(default="", max_length=2000)


class EvaluationView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    call_id: int
    evaluator: str
    score: int
    notes: str
    created_at: datetime


class ActiveCallView(BaseModel):
    session_id: str
    actor: str
    source_extension: str
    destination: str
    media: str
    state: str
    started_at: datetime
    held: bool
    mos: float | None


class AuditView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    occurred_at: datetime
    actor: str
    action: str
    outcome: str
    source_ip: str | None
    correlation_id: str
    details: dict


class ProvisionUserRequest(BaseModel):
    midpoint_oid: str = Field(min_length=8, max_length=80)
    username: str = Field(pattern=r"^[a-zA-Z0-9._-]{3,80}$")
    display_name: str = Field(min_length=2, max_length=160)
    role: Role
    extension: str = Field(pattern=r"^[0-9]{4}$")
    active: bool = True
