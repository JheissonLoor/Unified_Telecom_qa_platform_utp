from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auditing import record_audit
from app.database import get_db
from app.dependencies import current_user
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserView
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def user_view(user: User) -> UserView:
    return UserView(
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        active=user.active,
        extension=user.extension.number if user.extension else None,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(
        select(User).options(selectinload(User.extension)).where(User.username == payload.username)
    )
    source_ip = request.client.host if request.client else None
    if user is None or not user.active or not verify_password(payload.password, user.password_hash):
        await record_audit(
            db,
            actor=payload.username,
            action="LOGIN",
            outcome="DENIED",
            source_ip=source_ip,
        )
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    token, expires_in = create_access_token(user.username, user.role)
    await record_audit(
        db, actor=user.username, action="LOGIN", outcome="SUCCESS", source_ip=source_ip
    )
    return TokenResponse(access_token=token, expires_in=expires_in, user=user_view(user))


@router.get("/me", response_model=UserView)
async def me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    loaded = await db.scalar(
        select(User).options(selectinload(User.extension)).where(User.id == user.id)
    )
    return user_view(loaded or user)
