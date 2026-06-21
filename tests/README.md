# Estrategia de pruebas

| Nivel | Herramienta prevista | Objetivo |
|---|---|---|
| Unitarias backend | Pytest | Dominio, validacion y autorizacion |
| Unitarias frontend | Vitest/Testing Library | Componentes y estados |
| Integracion | Pytest + servicios Compose | API, BD, Asterisk y midPoint |
| E2E/humo/regresion | Playwright | Flujos por rol en navegador |
| Carga | k6 | API y senalizacion dentro del laboratorio |
| Seguridad | Trivy y pruebas HTTP | Imagenes, dependencias, secretos y RBAC |
| Compatibilidad | Matriz manual automatizable | Chrome, Edge, codecs y softphone |

Las pruebas SIP/RTP especializadas podran usar SIPp cuando el escenario sea
reproducible y no requiera credenciales reales.
