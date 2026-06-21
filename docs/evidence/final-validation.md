# Acta de validacion final

- Fecha UTC: 2026-06-21
- Version: 1.1.0
- Ambiente: Windows, Docker Desktop 29.2.1, puertos host alternativos
- Dictamen: aprobado para demostracion academica con observaciones

## Evidencia ejecutada

| Evidencia | Resultado |
|---|---|
| Arranque | `docker compose up -d --build` exitoso |
| Salud | 8 servicios activos; healthchecks disponibles aprobados |
| PJSIP/ODBC | 5 endpoints y conexion ODBC activa |
| SIP tradicional | 1001-1002, Digest, RTP PCMU bidireccional, CDR `55|1001|1002|ANSWERED|2` |
| WebRTC | Playwright Chromium aprobo voz y video 2001-2002 |
| Controles SIP | Retener/reanudar, DTMF INFO y conferencia 700 aprobados en E2E real |
| CDR | `ANSWERED`, 5 s, origen 2001, destino 2002, `media=secure` |
| Grabacion | MixMonitor genero WAV; descarga autorizada HTTP 200 y 24,044 bytes |
| Calidad | WebRTC `getStats()` persistio MOS 4.49/4.50, jitter, RTT y perdida |
| Servicios | API, PostgreSQL, PBX, grabacion, IVR y red reportaron `ok` |
| Auditoria | LOGIN, SIP_CONFIG_READ, CALL_STARTED/ENDED y provisionamiento |
| midPoint | Objetos idempotentes y `agente3 -> 2003` sincronizado |
| Carga | 300 peticiones, 0% error, p95 2.34 ms |
| Frontend | 24/24; lineas 96.02%; build y ESLint aprobados |
| Backend | 9/9; cobertura 82.21%; filtros, MOS, DND, reportes, usuarios y evaluacion QA |
| npm audit | 0 vulnerabilidades |
| Trivy | 0 vulnerabilidades, 0 secretos, 0 misconfiguraciones |
| SonarQube | Gate OK, cobertura 86.3%, 0 bugs/vulnerabilidades, 1 code smell, 0 hotspots |

## Trazabilidad de seguridad

- Los contenedores propios ejecutan backend UID 10001, Nginx UID 101,
  Asterisk UID 999 y coturn UID 65534.
- La sincronizacion IAM usa una CA exportada y no admite `--insecure`.
- La cuenta administrativa de SonarQube usa una clave aleatoria en `.env`.
- Trivy detecto inicialmente cuatro CVE altas y cuatro usuarios root; todos los
  hallazgos fueron remediados y el escaneo final quedo en cero.

## Riesgos residuales

1. Sustituir la CA de laboratorio por PKI corporativa antes de produccion.
2. Ejecutar compatibilidad adicional con dos softphones fisicos y la red destino.
3. Resolver el code smell no bloqueante registrado
   por SonarQube y mantener el gate de cobertura global >=80%.
