# Matriz ISO/IEC 27001:2022

| Control | Aplicacion | Verificacion |
|---|---|---|
| A.5.15 Control de acceso | RBAC servidor y denegacion por defecto | Matriz 200/403 |
| A.5.16 Identidades | Roles y ciclo de vida en midPoint | Importacion y sync |
| A.5.17 Autenticacion | Secretos aleatorios fuera de Git | Bootstrap y escaneo |
| A.5.18 Derechos | Rol por usuario y revocacion | Cambio midPoint y auditoria |
| A.8.5 Autenticacion segura | Argon2, JWT HS256 corto | Pruebas unitarias/login |
| A.8.8 Vulnerabilidades | npm audit y Trivy | Reportes fechados |
| A.8.15 Logging | Eventos estructurados sin credenciales | Revision de auditoria |
| A.8.16 Monitoreo | Health checks y eventos correlacionados | Compose/API |
| A.8.20 Redes | Cuatro redes y BD interna | `docker network inspect` |
| A.8.24 Criptografia | TLS 1.2/1.3 y DTLS-SRTP | Navegador, SDP y certificados |
| A.8.25 SDLC seguro | Fases, gates y trazabilidad | Git, plan y actas |
| A.8.29 Pruebas | Unitarias, E2E, carga y seguridad | Reportes QA |
