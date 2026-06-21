# Hoja de ruta y criterios de salida

| Fase | Entregable verificable | Criterio de salida | Evidencia minima |
|---:|---|---|---|
| 1 | Arquitectura, requisitos, historias, matrices y repo | Documentos coherentes y enlaces validos | EV-F1-01 inventario; EV-F1-02 arbol; EV-F1-03 revision |
| 2 | Compose base | Servicios arrancan con health checks o limitacion explicita | `docker compose ps`, health endpoints |
| 3 | PJSIP 1001/1002 | Ambos registran y completan llamada SIP | CLI PJSIP y captura de llamada |
| 4 | CDR PostgreSQL | Llamada genera fila correcta y consultable | Consulta SQL anonimizada |
| 5 | Login y paneles | Rutas y API aplican los tres roles | Capturas y matriz 200/403 |
| 6 | Voz WebRTC | Registro WSS y audio bidireccional | DevTools, CLI y CDR |
| 7 | Video WebRTC | Video VP8 compatible o degradacion a audio | `webrtc-internals` redactado |
| 8 | midPoint | Alta/cambio/baja idempotente | Tarea IAM, API y estado Asterisk |
| 9 | Seguridad | TLS/WSS/SRTP, redes y logs seguros verificados | Protocolos, puertos y pruebas negativas |
| 10 | QA final | Suites y analizadores ejecutados; riesgos declarados | Reportes, matriz final y video |

## Politica de avance

- Una fase no se cierra solo porque sus archivos existan; debe cumplir su prueba.
- Un bloqueo externo se documenta con causa, impacto, alternativa y riesgo.
- Los cambios de alcance actualizan requisitos, ADR, trazabilidad y pruebas.
- Cada evidencia indica commit, ambiente, fecha UTC y pasos de reproduccion.

## Estrategia de ramas y entregas

Para un equipo universitario pequeno se recomienda rama principal protegida,
ramas cortas `feature/fase-N-descripcion` y revision antes de integrar. Cada fase
debe terminar con etiqueta `fase-N` despues de ejecutar su criterio de salida.
