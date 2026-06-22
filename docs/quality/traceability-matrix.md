# Matriz de trazabilidad inicial

Los casos de prueba se implementaran en la Fase 10, pero sus identificadores se
reservan desde ahora para evitar pruebas desconectadas de los requisitos.

| Requisito | Historias | Fase | Prueba prevista | Evidencia | Calidad/control |
|---|---|---:|---|---|---|
| RF-AUT-001 | HU-01 | 5 | CP-AUT-001/002 | Captura login y log redactado | Seguridad, A.8.5 |
| RF-RBA-001 | HU-01, HU-05, HU-07 | 5/9 | CP-RBA-001..009 | Matriz HTTP 200/403 | Seguridad, A.5.15 |
| RF-IAM-001 | HU-09, HU-10 | 8 | CP-IAM-001..006 | Tarea midPoint y auditoria | A.5.16, trazabilidad |
| RF-SIP-001 | HU-12 | 3 | CP-SIP-001/002 | Registro CLI y llamada | Adecuacion funcional |
| RF-SIP-002 | HU-02 | 6/9 | CP-WSS-001/002 | DevTools y CLI redactados | A.8.20, compatibilidad |
| RF-VOZ-001 | HU-03 | 6 | CP-VOZ-001..004 | Audio, SDP redactado, CDR | Funcionalidad, fiabilidad |
| RF-VID-001 | HU-04 | 7 | CP-VID-001..004 | Estadisticas WebRTC | Compatibilidad, eficiencia |
| RF-CDR-001 | HU-03, HU-05 | 4 | CP-CDR-001..005 | Consulta SQL anonimizada | Integridad, trazabilidad |
| RF-AUD-001 | HU-01, HU-07, HU-10 | 4/5/8 | CP-AUD-001..006 | Eventos correlacionados | A.8.15, A.8.16 |
| RF-REP-001 | HU-05 | 5 | CP-REP-001..005 | API/UI con filtros | Usabilidad, funcionalidad |
| RF-QA-001 | HU-08, HU-11 | 10 | CP-QA-001..003 | Reportes de herramientas | CMMI PPQA/VER |
| RF-CTL-001 | HU-03 | 6 | CP-CTL-001..003 | Playwright y auditoria correlacionada | Adecuacion funcional |
| RF-CON-001 | HU-03 | 6 | CP-CON-001 | Canal ConfBridge 700 | Compatibilidad, fiabilidad |
| RF-CON-002 | HU-13 | 7 | CP-CON-002 | Dos navegadores en ConfBridge SFU 702 | Compatibilidad, eficiencia |
| RF-EVT-001 | HU-06, HU-14 | 9 | CP-EVT-001 | AMI interno y WebSocket HTTP 101 | Fiabilidad, A.8.16 |
| RF-PDF-001 | HU-05, HU-14 | 10 | CP-PDF-001 | PDF renderizado y auditoria | Usabilidad, trazabilidad |
| RF-REC-001 | HU-05 | 4/9 | CP-REC-001 | WAV y respuesta autorizada | A.5.15, A.8.15 |
| RF-EXT-001 | HU-10 | 8 | CP-EXT-001..005 | Alta/baja y denegacion | A.5.18, integridad |

## Convencion

- `CP-*`: caso de prueba.
- `EV-F<fase>-NN`: evidencia controlada por fase.
- Un caso fallido referencia defecto `DEF-NNN` y conserva resultado esperado,
  observado, ambiente, fecha y version.
