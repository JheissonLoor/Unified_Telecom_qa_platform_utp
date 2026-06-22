# Historias de usuario

| ID | Historia | Criterios de aceptacion resumidos |
|---|---|---|
| HU-01 | Como usuario, quiero iniciar sesion para acceder a mis funciones | Sesion valida; error generico; intento auditado; bloqueo basico |
| HU-02 | Como agente, quiero ver mi extension y estado SIP | Solo extension propia; estado actualizado; sin mostrar secreto SIP |
| HU-03 | Como agente, quiero llamar a otra extension desde el navegador | Registro WSS; audio bidireccional; colgado consistente; CDR generado |
| HU-04 | Como agente, quiero activar video durante una llamada compatible | Permiso explicito; VP8 negociado; rechazo no rompe audio |
| HU-05 | Como supervisor, quiero consultar CDR de mi equipo | Filtros; paginacion; permiso por alcance; acceso auditado |
| HU-06 | Como supervisor, quiero observar estados de agentes | Estados autorizados; actualizacion; fallo de Asterisk visible |
| HU-07 | Como AdministradorQA, quiero revisar auditoria | Filtros; orden UTC; detalle correlacionado; sin datos sensibles |
| HU-08 | Como AdministradorQA, quiero consultar metricas de calidad | Estado de pruebas, SonarQube y Trivy con fecha de ejecucion |
| HU-09 | Como administrador IAM, quiero asignar roles en midPoint | Solo roles validos; cambio idempotente; resultado y error auditados |
| HU-10 | Como administrador IAM, quiero asignar una extension | Unicidad; rango permitido; aplicacion controlada en Asterisk |
| HU-11 | Como auditor, quiero trazar requisito, prueba y evidencia | IDs enlazados; resultado reproducible; responsable y fecha |
| HU-12 | Como operador, quiero levantar la plataforma de forma repetible | Un comando documentado; health checks; datos sinteticos |
| HU-13 | Como agente, quiero entrar a una videoconferencia | Sala 702; dos participantes; video remoto; salida limpia |
| HU-14 | Como supervisor, quiero datos y reportes actuales | Eventos autenticados; MOS actualizado; PDF descargable y auditado |

## Definicion de terminado para cada historia

1. Criterios automatizados cuando sean tecnicamente viables.
2. Revisión de autorizacion y tratamiento de datos.
3. Documentacion de operacion actualizada.
4. Evidencia identificada sin secretos ni datos personales.
5. Trazabilidad a requisito y caracteristica de calidad.
