from cryptography.fernet import Fernet


def test_password_hash_does_not_expose_password(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("APP_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("PROVISIONING_TOKEN", "p" * 32)
    monkeypatch.setenv("DEMO_AGENT_PASSWORD", "AgentPassword123!")
    monkeypatch.setenv("DEMO_AGENT2_PASSWORD", "AgentPassword456!")
    monkeypatch.setenv("DEMO_SUPERVISOR_PASSWORD", "SupervisorPassword123!")
    monkeypatch.setenv("DEMO_ADMIN_PASSWORD", "AdminPassword123!")
    monkeypatch.setenv("WEBRTC_2001_SECRET", "sip-secret-2001")
    monkeypatch.setenv("WEBRTC_2002_SECRET", "sip-secret-2002")
    monkeypatch.setenv("TURN_PASSWORD", "turn-password")

    from app.security import hash_password, verify_password

    password = "CorrectHorseBatteryStaple!"
    value = hash_password(password)
    assert password not in value
    assert verify_password(password, value)
    assert not verify_password("wrong-password", value)


def test_tokens_and_encrypted_secrets_round_trip():
    from app.security import (
        create_access_token,
        decode_access_token,
        decrypt_secret,
        encrypt_secret,
    )

    token, expires_in = create_access_token("agente1", "AgenteCallCenter")
    claims = decode_access_token(token)
    encrypted = encrypt_secret("sip-secret-for-test")

    assert claims["sub"] == "agente1"
    assert claims["role"] == "AgenteCallCenter"
    assert expires_in > 0
    assert "sip-secret-for-test" not in encrypted
    assert decrypt_secret(encrypted) == "sip-secret-for-test"
