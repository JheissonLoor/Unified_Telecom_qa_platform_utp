# Plan de pruebas

## Objetivo

Verificar funcionalidad, seguridad, compatibilidad y operabilidad desde unidades
aisladas hasta una llamada WebRTC integrada.

| Nivel | Herramienta | Entrada | Criterio de salida |
|---|---|---|---|
| Unitario backend | pytest | Seguridad y dominio | 100% aprobado |
| Unitario frontend | Vitest | Login y componentes criticos | 100% aprobado |
| Integracion | pytest/httpx | OpenAPI, BD, CDR y auditoria | Sin fallos altos |
| E2E | Playwright | Login, rol, historial y UI | Chrome escritorio/movil aprobados |
| SIP | SIPp/softphones | OPTIONS, registro y llamada 1001-1002 | Respuesta y audio correctos |
| WebRTC | SIP.js/navegadores | Registro, voz, video y colgado | Dos agentes completan el flujo |
| Carga | k6/SIPp | API y senalizacion | p95 API menor a 500 ms |
| Seguridad | Trivy y pruebas RBAC | Repo, imagenes y endpoints | Sin criticos no aceptados |

## Ambientes

- Local integrado: Docker Compose, certificados sinteticos y datos ficticios.
- Navegadores: Chrome/Chromium y Edge actuales del laboratorio.
- Softphone: Linphone o MicroSIP compatible con PJSIP.

## Gestion de defectos

Critico bloquea autenticacion, autorizacion o comunicaciones principales; alto
rompe un requisito prioritario; medio tiene alternativa; bajo es cosmético. Cada
defecto registra requisito, ambiente, pasos, evidencia, severidad y estado.
