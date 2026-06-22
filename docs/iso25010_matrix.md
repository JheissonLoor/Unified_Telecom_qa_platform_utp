# Matriz ISO/IEC 25010

| Caracteristica | Implementacion | Evidencia |
|---|---|---|
| Adecuacion funcional | Login, RBAC, SIP, WebRTC, SFU 702, CDR, PDF e IAM | CP-AUT, CP-RBA, CP-SIP, CP-VID, CP-CON, CP-PDF |
| Eficiencia | Contenedores con health checks y prueba k6 | Reporte k6 y recursos Docker |
| Compatibilidad | SIP UDP/TLS, WSS y codecs comunes | SDP redactado y matriz de navegadores |
| Usabilidad | UI por rol, errores claros y responsive | Playwright escritorio/movil |
| Fiabilidad | Persistencia, reconexion WebSocket, AMI y health checks | `docker compose ps`, CP-EVT-001 |
| Seguridad | Argon2, JWT, RBAC, TLS, SRTP, redaccion | Trivy y pruebas negativas |
| Mantenibilidad | TypeScript, OpenAPI, modulos, lint y pruebas | ESLint, pytest y SonarQube |
| Portabilidad | Dockerfiles y Compose | Arranque documentado Windows/Linux |
