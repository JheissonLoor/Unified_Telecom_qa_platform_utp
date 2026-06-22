# Especificacion de requisitos de software

## Alcance y actores

La plataforma permite a agentes realizar comunicaciones, a supervisores observar
operacion y reportes, y a administradores QA gobernar usuarios, calidad y
auditoria. Los actores tecnicos son midPoint, Asterisk y los procesos de QA.

## Requisitos funcionales

| ID | Requisito | Criterio verificable | Prioridad |
|---|---|---|---|
| RF-AUT-001 | Autenticar usuarios | Credencial valida entrega sesion; invalida devuelve 401 y audita el intento | Alta |
| RF-RBA-001 | Aplicar RBAC | Cada endpoint protegido rechaza roles no autorizados con 403 | Alta |
| RF-IAM-001 | Aprovisionar identidades | Alta/cambio/baja desde midPoint se refleja en usuario, rol y extension | Alta |
| RF-SIP-001 | Registrar SIP tradicional | 1001 y 1002 se registran por UDP 5060 y completan una llamada | Alta |
| RF-SIP-002 | Registrar WebRTC | Un agente se registra por WSS sin contenido mixto en navegador | Alta |
| RF-VOZ-001 | Realizar llamada WebRTC | Dos extensiones establecen audio bidireccional y finalizan limpiamente | Alta |
| RF-VID-001 | Realizar videollamada | Dos clientes compatibles negocian video VP8 y audio | Media |
| RF-CON-001 | Realizar conferencia de voz | Un agente entra a la sala 700 y conserva audio bidireccional | Media |
| RF-CON-002 | Realizar videoconferencia | Dos o mas agentes entran a 702 y reciben video remoto compatible | Media |
| RF-CDR-001 | Persistir CDR | Cada llamada terminada produce un registro consultable en PostgreSQL | Alta |
| RF-AUD-001 | Registrar auditoria | Login, asignacion, llamada y consulta de reporte dejan evento correlacionado | Alta |
| RF-REP-001 | Consultar reportes | Supervisor/QA filtra CDR por fecha, agente, estado y duracion | Media |
| RF-EVT-001 | Actualizar panel en vivo | Eventos AMI actualizan llamadas y calidad sin recarga manual | Media |
| RF-PDF-001 | Exportar reporte | Supervisor/QA descarga un PDF valido y la accion queda auditada | Media |
| RF-QA-001 | Consultar metricas QA | Administrador QA ve resultados de pruebas, vulnerabilidades y calidad | Media |
| RF-EXT-001 | Administrar extensiones | Solo AdministradorQA crea, bloquea o reasigna extensiones | Media |

## Requisitos no funcionales

| ID | Caracteristica | Umbral inicial del laboratorio |
|---|---|---|
| RNF-SEG-001 | Confidencialidad | HTTPS/WSS/TLS y DTLS-SRTP en flujos WebRTC; sin secretos en Git o logs |
| RNF-SEG-002 | Autorizacion | Denegacion por defecto y cobertura de prueba para los tres roles |
| RNF-FIA-001 | Disponibilidad | Health checks para servicios y recuperacion tras reinicio de contenedor |
| RNF-FIA-002 | Integridad | Restricciones de BD y auditoria append-only desde la API de aplicacion |
| RNF-EFI-001 | API | p95 menor a 500 ms con 50 usuarios virtuales en consultas del laboratorio |
| RNF-EFI-002 | Llamada | Establecimiento p95 menor a 5 s en red local controlada |
| RNF-USA-001 | Usabilidad | Flujo login-llamada ejecutable sin documentacion en una prueba con usuarios |
| RNF-MAN-001 | Mantenibilidad | Analisis estatico sin bloqueadores y cobertura objetivo de 80% en dominio critico |
| RNF-POR-001 | Portabilidad | Arranque documentado con Docker Compose en Windows/Linux compatibles |
| RNF-COM-001 | Compatibilidad | Matriz verificada en Chrome, Edge y un softphone SIP seleccionado |
| RNF-AUD-001 | Trazabilidad | Todos los eventos incluyen UTC, actor, accion, resultado y correlation ID |
| RNF-REC-001 | Recuperacion | Restauracion documentada y probada para datos del laboratorio |

## Reglas de negocio

1. Una extension activa pertenece como maximo a un usuario activo.
2. `AgenteCallCenter` llama y consulta solo su actividad.
3. `Supervisor` consulta actividad de su alcance, pero no gestiona controles QA.
4. `AdministradorQA` gestiona configuracion, auditoria y resultados de calidad.
5. Ningun rol de interfaz obtiene credenciales administrativas de Asterisk,
   PostgreSQL o midPoint.
6. Todas las fechas persistidas usan UTC y la UI presenta la zona del usuario.
7. CDR y auditoria son fuentes distintas y se correlacionan, no se sustituyen.

## Fuera de alcance inicial

- Alta disponibilidad, multi-region y SLA de produccion.
- Telefonia con PSTN real, numeros publicos o grabaciones con datos personales.
- Transcodificacion de video entre codecs incompatibles.
- Certificacion formal ISO o evaluacion oficial CMMI.
