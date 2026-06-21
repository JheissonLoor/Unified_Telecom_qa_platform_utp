"""Synchronize midPoint users to the API and generated Asterisk PJSIP config."""

from __future__ import annotations

import argparse
import base64
import json
import os
import ssl
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.request import Request, urlopen


def load_local_env() -> None:
    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            os.environ.setdefault(name, value)


def text_by_local_name(element: ET.Element, name: str) -> str | None:
    for child in element.iter():
        if child.tag.rsplit("}", 1)[-1] == name and child.text:
            return child.text.strip()
    return None


def verified_context(ca_file: str | None) -> ssl.SSLContext | None:
    return ssl.create_default_context(cafile=ca_file) if ca_file else None


def fetch_users(
    url: str, username: str, password: str, ca_file: str | None
) -> list[dict[str, str]]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    request = Request(url, headers={"Authorization": f"Basic {token}", "Accept": "application/xml"})
    context = verified_context(ca_file)
    with urlopen(request, timeout=30, context=context) as response:
        root = ET.fromstring(response.read())
    users = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] != "object" or "oid" not in element.attrib:
            continue
        name = text_by_local_name(element, "name")
        extension = text_by_local_name(element, "employeeNumber")
        role = text_by_local_name(element, "organizationalUnit")
        if name and extension and role:
            users.append({
                "midpoint_oid": element.attrib.get("oid", name),
                "username": name,
                "display_name": text_by_local_name(element, "fullName") or name,
                "role": role,
                "extension": extension,
                "active": True,
            })
    return users


def provision(
    backend: str, token: str, user: dict[str, str], ca_file: str | None
) -> dict[str, str]:
    request = Request(
        f"{backend}/api/provisioning/users/{user['username']}",
        data=json.dumps(user).encode(),
        method="PUT",
        headers={"Content-Type": "application/json", "X-Provisioning-Token": token},
    )
    context = verified_context(ca_file)
    with urlopen(request, timeout=30, context=context) as response:
        return json.loads(response.read())


def pjsip_entry(extension: str, secret: str) -> str:
    return f"""
[{extension}](webrtc-endpoint)
auth={extension}-auth
aors={extension}
callerid=midPoint {extension} <{extension}>

[{extension}-auth]
type=auth
auth_type=userpass
username={extension}
password={secret}

[{extension}](webrtc-aor)
"""


def main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--midpoint-url",
        default=f"http://localhost:{os.getenv('HOST_MIDPOINT_PORT', '8080')}/midpoint/ws/rest/users",
    )
    parser.add_argument("--midpoint-user", default="administrator")
    parser.add_argument("--midpoint-password", default=os.getenv("MIDPOINT_ADMIN_PASSWORD"))
    parser.add_argument(
        "--backend", default=f"https://localhost:{os.getenv('HOST_HTTPS_PORT', '443')}"
    )
    parser.add_argument("--provisioning-token", default=os.getenv("PROVISIONING_TOKEN"))
    parser.add_argument("--ca-file", help="CA certificate used to verify HTTPS endpoints")
    parser.add_argument("--no-reload", action="store_true")
    args = parser.parse_args()
    if not args.midpoint_password:
        raise SystemExit("Set MIDPOINT_ADMIN_PASSWORD in .env or pass --midpoint-password")
    if not args.provisioning_token:
        raise SystemExit("Set PROVISIONING_TOKEN or pass --provisioning-token")

    users = fetch_users(
        args.midpoint_url, args.midpoint_user, args.midpoint_password, args.ca_file
    )
    entries = ["; Generated from midPoint. Do not commit.\n"]
    for user in users:
        result = provision(args.backend, args.provisioning_token, user, args.ca_file)
        entries.append(pjsip_entry(result["extension"], result["sip_secret"]))
        print(f"Provisioned {result['username']} -> {result['extension']}")

    destination = Path(__file__).resolve().parents[1] / "infrastructure" / "asterisk" / "generated" / "midpoint_endpoints.conf"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", delete=False, dir=destination.parent, encoding="utf-8") as handle:
        handle.write("\n".join(entries))
        temporary = Path(handle.name)
    temporary.replace(destination)
    if not args.no_reload:
        subprocess.run(
            [
                "docker", "compose", "exec", "-T", "asterisk", "asterisk", "-rx",
                "module reload res_pjsip.so",
            ],
            check=True,
        )


if __name__ == "__main__":
    main()
