# Matriz ISO/IEC 25010

| Caracteristica | Implementacion | Evidencia |
|---|---|---|
| Adecuacion funcional | Login, RBAC, SIP, WebRTC, CDR, IAM | CP-AUT, CP-RBA, CP-SIP, CP-VID |
| Eficiencia | Contenedores con health checks y prueba k6 | Reporte k6 y recursos Docker |
| Compatibilidad | SIP UDP/TLS, WSS y codecs comunes | SDP redactado y matriz de navegadores |
| Usabilidad | UI por rol, errores claros y responsive | Playwright escritorio/movil |
| Fiabilidad | Persistencia, reinicios y health checks | `docker compose ps`, pruebas de reinicio |
| Seguridad | Argon2, JWT, RBAC, TLS, SRTP, redaccion | Trivy y pruebas negativas |
| Mantenibilidad | TypeScript, OpenAPI, modulos, lint y pruebas | ESLint, pytest y SonarQube |
| Portabilidad | Dockerfiles y Compose | Arranque documentado Windows/Linux |
