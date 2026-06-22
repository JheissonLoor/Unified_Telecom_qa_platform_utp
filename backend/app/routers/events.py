import asyncio

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.realtime import event_hub
from app.security import decode_access_token

router = APIRouter(tags=["events"])


@router.websocket("/api/events/ws")
async def realtime_events(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        credentials = await asyncio.wait_for(websocket.receive_json(), timeout=5)
        token = credentials.get("token") if isinstance(credentials, dict) else None
        if not isinstance(token, str):
            await websocket.close(code=4401, reason="No autenticado")
            return
        payload = decode_access_token(token)
        async with SessionLocal() as db:
            user = await db.scalar(select(User).where(User.username == payload.get("sub")))
        if user is None or not user.active:
            await websocket.close(code=4401, reason="Sesion invalida")
            return
    except (TimeoutError, jwt.PyJWTError, WebSocketDisconnect):
        await websocket.close(code=4401, reason="Sesion invalida")
        return

    await websocket.send_json({"type": "ready", "data": {"username": user.username}})
    subscription = event_hub.subscribe()
    queue = await anext(subscription)
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=25)
            except TimeoutError:
                event = {"type": "heartbeat", "data": {}}
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    finally:
        await subscription.aclose()
