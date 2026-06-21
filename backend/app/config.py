from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str
    jwt_secret: str = Field(min_length=32)
    jwt_access_minutes: int = 15
    app_encryption_key: str
    provisioning_token: str = Field(min_length=32)

    demo_agent_password: str
    demo_agent2_password: str
    demo_supervisor_password: str
    demo_admin_password: str
    webrtc_2001_secret: str
    webrtc_2002_secret: str
    stun_url: str = "stun:localhost:3478"
    turn_url: str = "turn:localhost:3478"
    turn_tls_url: str = "turns:localhost:5349"
    turn_user: str = "webrtc"
    turn_password: str
    asterisk_host: str = "asterisk"
    asterisk_http_port: int = 8088
    recordings_dir: str = "/recordings"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
