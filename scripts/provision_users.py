"""Import the academic roles and synthetic users into midPoint over REST."""

from __future__ import annotations

import argparse
import base64
import os
import ssl
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def load_local_env() -> None:
    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            os.environ.setdefault(name, value)


def post_object(
    url: str, username: str, password: str, body: bytes, ca_file: str | None
) -> int:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    request = Request(
        url,
        data=body,
        method="POST",
        headers={"Authorization": f"Basic {token}", "Content-Type": "application/xml"},
    )
    context = ssl.create_default_context(cafile=ca_file) if ca_file else None
    try:
        with urlopen(request, timeout=30, context=context) as response:
            return response.status
    except HTTPError as error:
        if error.code == 409:
            return error.code
        raise


def main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--url",
        default=f"http://localhost:{os.getenv('HOST_MIDPOINT_PORT', '8080')}/midpoint/ws/rest",
    )
    parser.add_argument("--username", default="administrator")
    parser.add_argument("--password", default=os.getenv("MIDPOINT_ADMIN_PASSWORD"))
    parser.add_argument("--ca-file", help="CA certificate used to verify an HTTPS endpoint")
    args = parser.parse_args()
    if not args.password:
        raise SystemExit("Set MIDPOINT_ADMIN_PASSWORD in .env or pass --password")

    root = Path(__file__).resolve().parents[1] / "infrastructure" / "midpoint" / "objects"
    for category in ("roles", "users"):
        for path in sorted((root / category).glob("*.xml")):
            status = post_object(
                f"{args.url}/{category}", args.username, args.password, path.read_bytes(), args.ca_file
            )
            print(f"{path.name}: HTTP {status}")


if __name__ == "__main__":
    main()
