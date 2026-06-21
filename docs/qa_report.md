# Reporte QA final

## Dictamen

Version evaluada: `1.1.0`, 21 de junio de 2026. La plataforma queda **aprobada
para demostracion academica con observaciones**. No se recomienda produccion sin
PKI corporativa, alta disponibilidad, recuperacion y pruebas con dispositivos
fisicos en la red objetivo.

## Resultados

| Gate | Resultado observado | Estado |
|---|---|---|
| Docker Compose | `docker compose up -d --build` finalizo correctamente | Aprobado |
| Servicios | PostgreSQL, backend, frontend, Asterisk, coturn, midPoint, Nginx y SonarQube activos | Aprobado |
| Backend | pytest: 9/9; cobertura 82.21%; API, RBAC, sesiones, evaluaciones y aprovisionamiento | Aprobado |
| Frontend | ESLint/build; Vitest 24/24; cobertura de lineas 96.02% | Aprobado |
| SIP tradicional | 1001-1002: Digest, INVITE/ACK/BYE, RTP PCMU bidireccional, CDR 55 | Aprobado |
| WebRTC | Playwright: registro WSS, voz y video entre 2001/2002 | Aprobado |
| Telefonia avanzada | Hold/resume, DTMF INFO y ConfBridge 700 en Playwright real | Aprobado |
| CDR | Dos registros finales `ANSWERED`, `media=secure` | Aprobado |
| Grabaciones | WAV MixMonitor persistido y descarga FastAPI con RBAC | Aprobado |
| Calidad de llamada | Jitter, RTT, perdida y MOS 4.49/4.50 persistidos | Aprobado |
| IAM | `agente3`, rol `AgenteCallCenter`, extension 2003 y PJSIP recargado | Aprobado |
| Auditoria | Login, lectura SIP/CDR, inicio/fin y provisionamiento persistidos | Aprobado |
| Carga | k6: 300/300, 0% error, p95 2.34 ms | Aprobado |
| Trivy | 0 vulnerabilidades, 0 secretos, 0 misconfiguraciones | Aprobado |
| SonarQube | Gate OK; cobertura 86.2%; 0 bugs, 0 vulnerabilidades, 5 code smells y 0 hotspots | Aprobado |
| npm audit | 0 vulnerabilidades | Aprobado |

## Observaciones

- La llamada SIP automatizada valida RTP bidireccional; dos softphones fisicos
  siguen siendo evidencia adicional de compatibilidad con hardware/red real.
- Los certificados son autofirmados y validos para el laboratorio `localhost`.
- Los usuarios sinteticos y puertos alternativos evitan colisionar con el otro
  proyecto que se ejecuta en paralelo.
- La grabacion se limita al laboratorio; produccion requiere cifrado en reposo,
  consentimiento y politica formal de retencion/borrado.
- El gate reproducible exige cobertura global >=80%. Los cinco code smells de
  mantenibilidad quedan documentados como deuda tecnica no bloqueante.

## Criterio de liberacion

La sustentacion puede usar esta version si no se muestran `.env`, tokens,
secretos SIP ni claves. Una liberacion productiva exige certificados
corporativos, compatibilidad con dispositivos reales, HA y pruebas de
recuperacion.
