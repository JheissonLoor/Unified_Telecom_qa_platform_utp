# Unified Telecom QA Platform

[![Quality Gate](https://github.com/JheissonLoor/Unified_Telecom_qa_platform_utp/actions/workflows/quality.yml/badge.svg)](https://github.com/JheissonLoor/Unified_Telecom_qa_platform_utp/actions/workflows/quality.yml)

Plataforma academica de comunicaciones unificadas con Asterisk PJSIP, SIP.js,
React, FastAPI, PostgreSQL, midPoint, coturn, Nginx y controles QA/ISO.

El proyecto Compose usa el nombre aislado `unified-telecom-qa-asterik` para no
interferir con otros laboratorios Docker del mismo equipo.

## Capacidades

- Login con Argon2, JWT corto y roles `AgenteCallCenter`, `Supervisor` y
  `AdministradorQA`.
- Extensiones SIP tradicionales 1001/1002 y WebRTC 2001/2002.
- Voz y video desde navegador con WSS, ICE y DTLS-SRTP.
- Consola de agente con DND, aceptacion/rechazo, mute, camara, altavoz,
  retencion SIP, transferencia, DTMF, conferencia de voz 700 y video SFU 702.
- CDR PostgreSQL con busqueda, filtros, paginacion, grabacion WAV protegida,
  estadisticas WebRTC y MOS calculado.
- Paneles RBAC de monitoreo, evaluaciones QA, reportes, auditoria y gestion de
  usuarios sincronizados con midPoint.
- Eventos en vivo autenticados desde Asterisk AMI al navegador y reporte PDF
  generado en servidor con auditoria de descarga.
- Objetos midPoint y sincronizacion de usuarios/roles/extensiones hacia Asterisk.
- Health checks, redes separadas, certificados locales y secretos fuera de Git.
- pytest, Vitest, Playwright, k6, SIPp, SonarQube y Trivy.

## Requisitos

- Docker Desktop con Linux Engine activo y Docker Compose v2 o posterior.
- 8 GB RAM libres recomendados; midPoint y SonarQube son los servicios pesados.
- PowerShell en Windows o POSIX shell con OpenSSL en Linux/macOS.

## Arranque

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
docker compose up -d --build
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1
```

Linux/macOS:

```bash
sh scripts/bootstrap.sh
docker compose up -d --build
sh scripts/smoke_test.sh
```

El bootstrap genera `.env` con valores aleatorios. Los usuarios sinteticos son
`agente1`, `agente2`, `supervisor` y `adminqa`; sus passwords se consultan
localmente en `.env` y nunca deben aparecer en capturas o commits.

## URLs

- Aplicacion: `https://localhost:${HOST_HTTPS_PORT}`
- OpenAPI: `https://localhost:${HOST_HTTPS_PORT}/docs`
- midPoint: `http://localhost:${HOST_MIDPOINT_PORT}/midpoint`
- SonarQube opcional: `http://localhost:${HOST_SONAR_PORT}`

El certificado HTTPS es autofirmado y exclusivo del laboratorio. El navegador
pedira aceptarlo la primera vez.

Los valores se leen de `.env`. Para ejecutar dos laboratorios a la vez, asigne
rangos `HOST_*` diferentes en cada proyecto.

## Telefonia

| Extension | Tipo | Transporte recomendado |
|---:|---|---|
| 1001 | Softphone | SIP TLS 5061 o UDP 5060 de laboratorio |
| 1002 | Softphone | SIP TLS 5061 o UDP 5060 de laboratorio |
| 2001 | Usuario `agente1` | WSS mediante Nginx |
| 2002 | Usuario `agente2` | WSS mediante Nginx |
| 600 | Echo test | Segun endpoint origen |
| 700 | Conferencia ConfBridge | Segun endpoint origen |
| 701 | IVR de demostracion y echo | Segun endpoint origen |
| 702 | Videoconferencia ConfBridge SFU | WSS/WebRTC con video |

Los secretos SIP se generan en `.env`. Asterisk admite Opus, PCMA, PCMU, VP8 y
H.264 cuando ambos extremos coinciden. La sala 702 reenvia video compatible en
modo SFU; no transcodifica codecs diferentes.

## midPoint

Importar roles y usuarios sinteticos:

```powershell
python scripts/provision_users.py
```

Sincronizar identidades, roles y extensiones al backend/Asterisk:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export_lab_ca.ps1
python scripts/sync_midpoint_asterisk.py `
  --ca-file infrastructure/certificates/generated/nginx-cert.pem
```

La CA exportada permite verificar el HTTPS local sin desactivar TLS. El archivo
PJSIP generado contiene secretos y esta excluido de Git.

## Calidad

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_quality.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run_trivy.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run_sipp_call.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run_sonarqube.ps1
```

Para probar una llamada con un celular en la misma Wi-Fi, consultar
[Prueba con celular](docs/mobile-softphone.md).

Si el registro npm no responde, `run_quality.ps1 -SkipNpmAudit` deja una
advertencia explicita; en ese caso Trivy es obligatorio como control
compensatorio sobre `package-lock.json`.

Las pruebas integradas requieren el stack activo. Los reportes se escriben bajo
`reports/` y deben revisarse antes de conservarse como evidencia.

## Documentacion

- [Arquitectura](docs/architecture/architecture.md)
- [Requisitos](docs/requirements/srs.md) y [historias](docs/requirements/user-stories.md)
- [Plan](docs/test_plan.md) y [casos de prueba](docs/test_cases.md)
- [ISO 25010](docs/iso25010_matrix.md), [ISO 27001](docs/iso27001_matrix.md) y [CMMI](docs/cmmi_mapping.md)
- [Riesgos](docs/risk_matrix.md), [puertos](docs/ports.md) y [modelo de amenazas](docs/security/threat-model.md)
- [Reporte QA](docs/qa_report.md), [evidencias](docs/evidence_checklist.md) y [demo](docs/demo-guide.md)

## Limitaciones declaradas

- Compose en un solo host no representa alta disponibilidad de produccion.
- SIP UDP no protege senalizacion y queda limitado al escenario de compatibilidad.
- Los certificados autofirmados no deben reutilizarse fuera del laboratorio.
- Las grabaciones usan un volumen local sin politica corporativa de retencion;
  produccion requiere cifrado en reposo, retencion y borrado aprobados.
- La adopcion ISO/CMMI es un alineamiento academico, no una certificacion.
