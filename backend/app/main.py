from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal, engine
from app.models import Base, Extension, User
from app.routers import auth, calls, governance
from app.security import encrypt_secret, hash_password


async def seed_demo_users() -> None:
    settings = get_settings()
    seeds = [
        ("agente1", "Agente 2001", "AgenteCallCenter", "2001", settings.demo_agent_password, settings.webrtc_2001_secret),
        ("agente2", "Agente 2002", "AgenteCallCenter", "2002", settings.demo_agent2_password, settings.webrtc_2002_secret),
        ("supervisor", "Supervisor QA", "Supervisor", None, settings.demo_supervisor_password, None),
        ("adminqa", "Administrador QA", "AdministradorQA", None, settings.demo_admin_password, None),
    ]
    async with SessionLocal() as db:
        for username, display_name, role, number, password, sip_secret in seeds:
            user = await db.scalar(select(User).where(User.username == username))
            if user is None:
                user = User(
                    username=username,
                    display_name=display_name,
                    password_hash=hash_password(password),
                    role=role,
                    active=True,
                )
                db.add(user)
                await db.flush()
            if number and sip_secret:
                extension = await db.scalar(select(Extension).where(Extension.number == number))
                if extension is None:
                    db.add(
                        Extension(
                            number=number,
                            user_id=user.id,
                            sip_secret_encrypted=encrypt_secret(sip_secret),
                        )
                    )
        await db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await seed_demo_users()
    yield
    await engine.dispose()


app = FastAPI(
    title="Unified Telecom QA API",
    version="1.1.0",
    description="Usuarios, RBAC, CDR, auditoria, metricas y aprovisionamiento.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost", "https://localhost:8443"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Provisioning-Token"],
)
app.include_router(auth.router)
app.include_router(calls.router)
app.include_router(governance.router)


@app.get("/health", tags=["operations"])
async def health():
    return {"status": "ok", "service": "backend"}
