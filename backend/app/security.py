from datetime import datetime, timedelta, timezone

import jwt
from cryptography.fernet import Fernet
from pwdlib import PasswordHash

from app.config import get_settings

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(subject: str, role: str) -> tuple[str, int]:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_minutes)
    token = jwt.encode(
        {"sub": subject, "role": role, "exp": expires, "iat": datetime.now(timezone.utc)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    return token, settings.jwt_access_minutes * 60


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])


def encrypt_secret(value: str) -> str:
    return Fernet(get_settings().app_encryption_key.encode()).encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    return Fernet(get_settings().app_encryption_key.encode()).decrypt(value.encode()).decode()
