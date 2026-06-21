# Checklist de evidencias

- [x] Version 1.0.0 y ambiente Windows/Docker identificados.
- [x] `docker compose config --quiet` y arranque con `--build` aprobados.
- [x] Servicios principales saludables; SonarQube activo en perfil QA.
- [x] Endpoints PJSIP 1001, 1002, 2001, 2002 y 2003 cargados.
- [x] Llamada SIP 1001-1002 con Digest, RTP PCMU bidireccional y CDR `ANSWERED`.
- [x] Login y RBAC de agente, Supervisor y AdministradorQA.
- [x] Registro WSS y llamada de voz WebRTC automatizada.
- [x] Videollamada automatizada con pistas locales en ambos navegadores.
- [x] Usuario midPoint sincronizado a extension 2003.
- [x] Eventos de login, reporte, llamada y provisionamiento auditados.
- [x] HTTPS/WSS, DTLS-SRTP, ICE y `media=secure` demostrados.
- [x] pytest, Vitest, cobertura >=80%, ESLint, build, Playwright y k6 aprobados.
- [x] npm audit nativo: 0 vulnerabilidades.
- [x] Trivy sin vulnerabilidades, secretos ni misconfiguraciones.
- [x] Quality Gate SonarQube aprobado y cuenta admin endurecida.
- [x] Capturas y reportes sin credenciales reales.
- [ ] Compatibilidad adicional con dos softphones fisicos; no hay hardware disponible en el laboratorio automatizado.
- [ ] Commit final; el repositorio aun no tiene un commit solicitado.
