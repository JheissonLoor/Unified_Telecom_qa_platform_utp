import asyncio
from collections.abc import AsyncIterator
from contextlib import suppress
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings


class EventHub:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    async def publish(self, event_type: str, data: dict[str, Any]) -> None:
        event = {
            "type": event_type,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        for queue in tuple(self._subscribers):
            if queue.full():
                with suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            queue.put_nowait(event)

    async def subscribe(self) -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        try:
            yield queue
        finally:
            self._subscribers.discard(queue)


event_hub = EventHub()


def parse_ami_frame(raw: bytes) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in raw.decode("utf-8", errors="replace").splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    return fields


async def _read_ami_frame(reader: asyncio.StreamReader) -> dict[str, str]:
    return parse_ami_frame(await reader.readuntil(b"\r\n\r\n"))


AMI_EVENTS = {
    "BridgeEnter",
    "BridgeLeave",
    "ConfbridgeJoin",
    "ConfbridgeLeave",
    "DTMFBegin",
    "Hangup",
    "Newchannel",
    "Newstate",
}
AMI_FIELDS = {
    "Event",
    "ChannelStateDesc",
    "CallerIDNum",
    "ConnectedLineNum",
    "Context",
    "Exten",
    "Uniqueid",
    "Linkedid",
    "BridgeUniqueid",
    "Conference",
    "Digit",
    "Cause-txt",
}


async def run_ami_listener() -> None:
    settings = get_settings()
    while True:
        writer: asyncio.StreamWriter | None = None
        try:
            reader, writer = await asyncio.open_connection(
                settings.asterisk_ami_host,
                settings.asterisk_ami_port,
            )
            login = (
                "Action: Login\r\n"
                f"Username: {settings.asterisk_ami_user}\r\n"
                f"Secret: {settings.asterisk_ami_secret}\r\n"
                "Events: on\r\n\r\n"
            )
            writer.write(login.encode())
            await writer.drain()
            response = await asyncio.wait_for(_read_ami_frame(reader), timeout=5)
            if response.get("Response") != "Success":
                raise ConnectionError("AMI rechazo la autenticacion")
            await event_hub.publish("pbx.connected", {"source": "AMI"})
            while True:
                frame = await _read_ami_frame(reader)
                event_name = frame.get("Event")
                if event_name not in AMI_EVENTS:
                    continue
                safe_data = {key: value for key, value in frame.items() if key in AMI_FIELDS}
                await event_hub.publish(f"pbx.{event_name.lower()}", safe_data)
        except asyncio.CancelledError:
            raise
        except (OSError, TimeoutError, ConnectionError, asyncio.IncompleteReadError):
            await event_hub.publish("pbx.disconnected", {"source": "AMI"})
            await asyncio.sleep(3)
        finally:
            if writer is not None:
                writer.close()
                with suppress(OSError):
                    await writer.wait_closed()
