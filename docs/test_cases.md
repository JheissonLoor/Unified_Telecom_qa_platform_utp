# Casos de prueba principales

| ID | Caso | Resultado esperado |
|---|---|---|
| CP-AUT-001 | Login valido | JWT corto y evento `LOGIN/SUCCESS` |
| CP-AUT-002 | Login invalido | HTTP 401, mensaje generico y auditoria sin contrasena |
| CP-RBA-001 | Agente consulta auditoria | HTTP 403 |
| CP-RBA-002 | AdministradorQA consulta auditoria | HTTP 200 |
| CP-SIP-001 | Registrar 1001 y 1002 por UDP | Ambos contactos disponibles |
| CP-SIP-002 | Llamar 1001 a 1002 | Audio bidireccional y colgado limpio |
| CP-WSS-001 | Registrar 2001 por WSS | SIP.js aparece `Registered` |
| CP-VOZ-001 | 2001 llama 2002 con audio | Sesion establecida con Opus/PCMA/PCMU |
| CP-VID-001 | 2001 llama 2002 con video | VP8 o H.264 compatible y audio preservado |
| CP-CTL-001 | Retener y reanudar llamada | Re-INVITE cambia SDP y conserva la sesion |
| CP-CTL-002 | Enviar DTMF 5 | SIP INFO aceptado por Asterisk |
| CP-CTL-003 | Transferir llamada | REFER valido y auditoria con destino |
| CP-CON-001 | Marcar 700 | Agente entra a sala ConfBridge |
| CP-CON-002 | Dos agentes marcan 702 con video | Ambos reciben al menos un flujo de video remoto por SFU |
| CP-DND-001 | Activar No Molestar | INVITE entrante recibe 486 y queda auditado |
| CP-CDR-001 | Finalizar llamada | Fila unica con origen, destino y duracion |
| CP-REC-001 | Finalizar llamada contestada | WAV existe y solo usuario autorizado lo descarga |
| CP-QA-001 | Reportar estadisticas WebRTC | MOS entre 1.0 y 4.5 persistido por session ID |
| CP-QA-002 | Supervisor evalua CDR | Puntaje 1-100 y observacion persistidos |
| CP-REP-001 | Filtrar historial | Total, offset y filas coinciden con criterios |
| CP-EVT-001 | Conectar WebSocket autenticado | HTTP 101 y eventos de Asterisk sin exponer token en URL |
| CP-PDF-001 | Exportar reporte de supervisor | MIME PDF, cabecera `%PDF`, contenido legible y evento de auditoria |
| CP-AUD-001 | Iniciar/finalizar llamada web | Eventos correlacionados por session ID |
| CP-IAM-001 | Sincronizar usuario agente3 | Usuario, rol, extension 2003 y endpoint PJSIP |
| CP-SEG-001 | Buscar secretos en repo/logs | Ninguna credencial o clave privada |
| CP-COM-001 | Ejecutar en Chrome y Edge | Login, audio y video compatibles |
| CP-CAR-001 | Cargar `/health` con 10 VU | Error menor a 1%, p95 menor a 500 ms |

Los resultados reales se registran en `reports/test-results/` y se relacionan
con la matriz de trazabilidad existente.
