# Matriz inicial de estandares

Este documento demuestra alineamiento academico. No constituye certificacion ISO
ni evaluacion oficial de madurez CMMI.

## ISO/IEC 25010 e ISO/IEC 9126 / NTP 9126

| Caracteristica | Aplicacion en el proyecto | Medida/evidencia prevista |
|---|---|---|
| Adecuacion funcional / funcionalidad | Login, RBAC, voz, video, CDR, IAM | Porcentaje de requisitos aprobados |
| Fiabilidad / confiabilidad | Health checks, reintentos controlados, recuperacion | Disponibilidad de prueba y recuperacion |
| Eficiencia de desempeno | Latencia API y establecimiento de llamada | p50/p95, recursos por contenedor |
| Usabilidad | Flujos por rol, errores accionables y accesibilidad | Tasa de exito y tiempo de tarea |
| Seguridad | TLS, SRTP, minimo privilegio, auditoria | Pruebas RBAC, Trivy y revision de logs |
| Compatibilidad | Navegadores, SIP y codecs | Matriz Chrome/Edge/softphone |
| Mantenibilidad | Modulos, tipos, lint, cobertura y ADR | SonarQube, cobertura, complejidad |
| Portabilidad | Imagenes y Compose documentado | Arranque limpio en ambientes objetivo |

## ISO/IEC 27001:2022, temas de control

| Referencia | Aplicacion prevista | Evidencia |
|---|---|---|
| A.5.15 Control de acceso | RBAC y denegacion por defecto | Pruebas positivas y negativas |
| A.5.16 Gestion de identidades | Ciclo de vida en midPoint | Tareas de alta, cambio y baja |
| A.5.17 Informacion de autenticacion | Secretos fuera de Git y logs | Escaneo y revision de configuracion |
| A.5.18 Derechos de acceso | Asignacion y revocacion trazable | Historial IAM y auditoria |
| A.8.5 Autenticacion segura | Hash, sesion corta y limites | Pruebas de autenticacion |
| A.8.8 Vulnerabilidades tecnicas | Trivy y remediacion priorizada | SBOM/reporte y registro de acciones |
| A.8.15 Logging | Eventos estructurados y redactados | Muestra de logs y esquema |
| A.8.16 Monitoreo | Alertas y correlacion de eventos | Dashboard o consultas guardadas |
| A.8.20 Seguridad de redes | Segmentacion Compose y puertos minimos | Diagrama y escaneo de puertos |
| A.8.24 Criptografia | TLS, WSS y DTLS-SRTP | Pruebas de protocolo y certificado |
| A.8.25 Ciclo de desarrollo seguro | Fases, gates y revision | Historial, checklist y CI |
| A.8.28 Codificacion segura | Validacion, consultas parametrizadas | SAST y revision de codigo |
| A.8.29 Pruebas de seguridad | Autorizacion, dependencias y DAST | Casos y reportes de seguridad |

## CMMI, practicas aplicadas

| Area | Mecanismo |
|---|---|
| Gestion de requisitos | IDs estables, prioridades, cambios y trazabilidad |
| Verificacion | Revisiones, unitarias, integracion y analisis estatico |
| Validacion | Escenarios por actor y demostracion en ambiente integrado |
| Aseguramiento de calidad | Criterios de salida, hallazgos y reporte QA independiente |
| Gestion de configuracion | Git, ADR, versiones de imagenes y configuracion revisada |

## Criterios de gate final

1. Cero vulnerabilidades criticas conocidas sin aceptacion documentada.
2. Cero secretos detectados en el historial preparado para entrega.
3. Todos los requisitos de prioridad alta trazados a pruebas ejecutadas.
4. Ningun defecto critico o alto abierto en autenticacion, RBAC o llamadas.
5. Limitaciones y riesgos residuales declarados en el reporte QA.
