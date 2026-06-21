"""Minimal deterministic SIP/RTP test peer for extension 1002."""

from __future__ import annotations

import hashlib
import os
import random
import re
import socket
import struct
import sys
import time
from uuid import uuid4

SERVER_HOST = os.getenv("SIP_SERVER", "asterisk")
SERVER_PORT = 5060
SIP_PORT = 5062
RTP_PORT = 40002
USERNAME = "1002"
PASSWORD = os.environ["SIP_1002_SECRET"]


def parse_headers(message: str) -> tuple[str, dict[str, str], str]:
    head, _, body = message.partition("\r\n\r\n")
    lines = head.split("\r\n")
    headers: dict[str, str] = {}
    for line in lines[1:]:
        if ":" in line:
            name, value = line.split(":", 1)
            headers[name.lower()] = value.strip()
    return lines[0], headers, body


def digest_parameters(challenge: str) -> dict[str, str]:
    return {
        key.lower(): value
        for key, quoted, bare in re.findall(r'(\w+)=(?:"([^"]*)"|([^,\s]+))', challenge)
        for value in [quoted or bare]
    }


def digest_authorization(challenge: str, method: str, uri: str) -> str:
    params = digest_parameters(challenge)
    realm = params["realm"]
    nonce = params["nonce"]
    qop = params.get("qop", "auth").split(",")[0]
    opaque = params.get("opaque")
    nc = "00000001"
    cnonce = uuid4().hex[:16]
    md5 = lambda value: hashlib.md5(value.encode(), usedforsecurity=False).hexdigest()
    ha1 = md5(f"{USERNAME}:{realm}:{PASSWORD}")
    ha2 = md5(f"{method}:{uri}")
    response = md5(f"{ha1}:{nonce}:{nc}:{cnonce}:{qop}:{ha2}")
    fields = [
        f'username="{USERNAME}"',
        f'realm="{realm}"',
        f'nonce="{nonce}"',
        f'uri="{uri}"',
        f'response="{response}"',
        "algorithm=MD5",
        f"qop={qop}",
        f"nc={nc}",
        f'cnonce="{cnonce}"',
    ]
    if opaque:
        fields.append(f'opaque="{opaque}"')
    return "Digest " + ", ".join(fields)


def wire(start: str, headers: list[str], body: str = "") -> bytes:
    return ("\r\n".join([start, *headers, f"Content-Length: {len(body.encode())}", "", body])).encode()


def response(request: str, status: str, *, body: str = "", contact: str | None = None) -> bytes:
    _, headers, _ = parse_headers(request)
    to_value = headers["to"]
    if "tag=" not in to_value:
        to_value += ";tag=qa-1002"
    values = [
        f"Via: {headers['via']}",
        f"From: {headers['from']}",
        f"To: {to_value}",
        f"Call-ID: {headers['call-id']}",
        f"CSeq: {headers['cseq']}",
    ]
    if contact:
        values.append(f"Contact: {contact}")
    if body:
        values.append("Content-Type: application/sdp")
    return wire(f"SIP/2.0 {status}", values, body)


def register(sock: socket.socket, local_ip: str) -> None:
    uri = f"sip:{SERVER_HOST}:{SERVER_PORT}"
    call_id = f"{uuid4().hex}@{local_ip}"
    tag = uuid4().hex[:10]
    contact = f"<sip:{USERNAME}@{local_ip}:{SIP_PORT};transport=udp>"

    def request(
        cseq: int,
        authorization: str | None = None,
        *,
        contact_value: str = contact,
        expires: int = 300,
    ) -> bytes:
        headers = [
            f"Via: SIP/2.0/UDP {local_ip}:{SIP_PORT};branch=z9hG4bK-{uuid4().hex[:12]};rport",
            f"From: <sip:{USERNAME}@{SERVER_HOST}>;tag={tag}",
            f"To: <sip:{USERNAME}@{SERVER_HOST}>",
            f"Call-ID: {call_id}",
            f"CSeq: {cseq} REGISTER",
            f"Contact: {contact_value}",
            "Max-Forwards: 70",
            f"Expires: {expires}",
        ]
        if authorization:
            headers.append(f"Authorization: {authorization}")
        return wire(f"REGISTER {uri} SIP/2.0", headers)

    # Clear stale dynamic contacts left by interrupted test runs before registering.
    sock.send(request(1, contact_value="*", expires=0))
    challenge_message = sock.recv(65535).decode(errors="replace")
    start, headers, _ = parse_headers(challenge_message)
    if " 401 " not in start:
        raise RuntimeError(f"Expected REGISTER challenge, received {start}")
    authorization = digest_authorization(headers["www-authenticate"], "REGISTER", uri)
    sock.send(request(2, authorization, contact_value="*", expires=0))
    cleared = sock.recv(65535).decode(errors="replace")
    cleared_start, _, _ = parse_headers(cleared)
    if " 200 " not in cleared_start:
        raise RuntimeError(f"Contact cleanup failed: {cleared_start}")

    sock.send(request(3))
    challenge_message = sock.recv(65535).decode(errors="replace")
    start, headers, _ = parse_headers(challenge_message)
    if " 401 " not in start:
        raise RuntimeError(f"Expected REGISTER challenge, received {start}")
    authorization = digest_authorization(headers["www-authenticate"], "REGISTER", uri)
    sock.send(request(4, authorization))
    accepted = sock.recv(65535).decode(errors="replace")
    accepted_start, _, _ = parse_headers(accepted)
    if " 200 " not in accepted_start:
        raise RuntimeError(f"REGISTER failed: {accepted_start}")


def rtp_target_from_sdp(body: str) -> tuple[str, int] | None:
    address = re.search(r"^c=IN IP4 ([^\r\n]+)", body, re.MULTILINE)
    audio = re.search(r"^m=audio (\d+)", body, re.MULTILINE)
    if not address or not audio:
        return None
    return address.group(1), int(audio.group(1))


def send_rtp_silence(target: tuple[str, int]) -> tuple[int, int]:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", RTP_PORT))
    sock.setblocking(False)
    sequence = random.randint(0, 65535)
    timestamp = random.randint(0, 2**32 - 1)
    ssrc = random.randint(0, 2**32 - 1)
    sent = 0
    received = 0
    deadline = time.monotonic() + 1.5
    try:
        while time.monotonic() < deadline:
            header = struct.pack("!BBHII", 0x80, 0, sequence, timestamp, ssrc)
            sock.sendto(header + bytes([0xFF]) * 160, target)
            sequence = (sequence + 1) & 0xFFFF
            timestamp = (timestamp + 160) & 0xFFFFFFFF
            sent += 1
            try:
                while sock.recvfrom(2048):
                    received += 1
            except BlockingIOError:
                pass
            time.sleep(0.02)
    finally:
        sock.close()
    return sent, received


def serve(sock: socket.socket, local_ip: str) -> None:
    contact = f"<sip:{USERNAME}@{local_ip}:{SIP_PORT};transport=udp>"
    invite_sdp = ""
    rtp_target: tuple[str, int] | None = None
    deadline = time.monotonic() + 15
    sock.settimeout(2)
    while time.monotonic() < deadline:
        try:
            request = sock.recv(65535).decode(errors="replace")
        except socket.timeout:
            continue
        start, _, body = parse_headers(request)
        method = start.split(" ", 1)[0]
        print(f"RECEIVED {method}", flush=True)
        if method == "OPTIONS":
            sock.send(response(request, "200 OK", contact=contact))
        elif method == "INVITE":
            rtp_target = rtp_target_from_sdp(body)
            sock.send(response(request, "100 Trying"))
            sock.send(response(request, "180 Ringing", contact=contact))
            invite_sdp = "\r\n".join(
                [
                    "v=0",
                    f"o=1002 1 1 IN IP4 {local_ip}",
                    "s=Automated traditional SIP acceptance",
                    f"c=IN IP4 {local_ip}",
                    "t=0 0",
                    f"m=audio {RTP_PORT} RTP/AVP 0 8",
                    "a=rtpmap:0 PCMU/8000",
                    "a=rtpmap:8 PCMA/8000",
                    "a=sendrecv",
                    "",
                ]
            )
            sock.send(response(request, "200 OK", body=invite_sdp, contact=contact))
        elif method == "ACK":
            sent, received = send_rtp_silence(rtp_target) if rtp_target else (0, 0)
            print(f"RTP_BIDIRECTIONAL sent={sent} received={received}", flush=True)
            if not received:
                raise RuntimeError("No return RTP packets were received through Asterisk")
        elif method == "BYE":
            sock.send(response(request, "200 OK"))
            print("CALL_COMPLETED 1001->1002", flush=True)
            return
        elif method == "CANCEL":
            sock.send(response(request, "200 OK"))
    raise TimeoutError("No complete INVITE/ACK/BYE exchange was received")


def main() -> int:
    server_ip = socket.gethostbyname(SERVER_HOST)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(45)
    sock.bind(("0.0.0.0", SIP_PORT))
    sock.connect((server_ip, SERVER_PORT))
    local_ip = sock.getsockname()[0]
    try:
        register(sock, local_ip)
        print(f"REGISTERED 1002 local_ip={local_ip}", flush=True)
        serve(sock, local_ip)
        return 0
    finally:
        sock.close()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"FAILED {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
