# Modelo de amenazas inicial

## Alcance, activos y supuestos

Activos prioritarios: credenciales de aplicacion y SIP, tokens, identidades y
roles, audio/video en transito, grabaciones WAV, CDR, auditoria, configuracion de Asterisk y
resultados QA. Se asume una red de laboratorio no confiable y datos sinteticos.

Fronteras de confianza:

1. Navegador o softphone hacia Nginx, Asterisk y coturn.
2. Borde hacia red de aplicacion.
3. Aplicacion/Asterisk/midPoint hacia red de datos.
4. Administrador y pipeline hacia secretos e infraestructura.

## Analisis STRIDE

| Amenaza | Escenario | Control de diseno | Verificacion |
|---|---|---|---|
| Suplantacion | Fuerza bruta o robo de token/SIP | Hash fuerte, rate limit, tokens cortos, TLS | Prueba de intentos y expiracion |
| Manipulacion | Alterar rol, extension o CDR | Validacion servidor, RBAC, restricciones BD | Pruebas 403 y de integridad |
| Repudio | Negar login, llamada o cambio IAM | Auditoria UTC correlacionada y acceso restringido | Reconciliar API, CDR e IAM |
| Divulgacion | Secretos o SDP sensible en Git/log | Secretos montados, redaccion, minimo logging | Escaneo de secretos y logs |
| Denegacion | Flood SIP, login o reportes costosos | Limites Nginx/Asterisk, paginacion, cuotas | k6 y prueba SIP controlada |
| Elevacion | Agente invoca administracion QA | Denegacion por defecto y permisos backend | Matriz RBAC completa |

## Riesgos prioritarios

| ID | Riesgo | Probabilidad | Impacto | Tratamiento |
|---|---|---|---|---|
| R-01 | Credencial SIP visible en navegador o evidencia | Alta | Alta | Credencial unica, alcance minimo, redaccion y rotacion |
| R-02 | Puertos AMI/BD/midPoint expuestos | Media | Alta | Redes internas, firewall y comprobacion de puertos |
| R-03 | Bypass RBAC confiando en la UI | Media | Critico | Autorizacion por endpoint y pruebas negativas |
| R-04 | Intercepcion SIP/RTP tradicional | Media | Alta | TLS/SRTP; UDP solo como escenario legado documentado |
| R-05 | Inyeccion de configuracion desde midPoint | Media | Alta | Esquema estricto, allowlist y operacion idempotente |
| R-06 | Auditoria contiene tokens o contrasenas | Media | Alta | Filtro central y pruebas de no divulgacion |
| R-07 | Dependencia vulnerable o imagen flotante | Alta | Media | Versiones fijadas, SBOM, Trivy y actualizacion |
| R-08 | Video incompatible entre extremos | Alta | Media | VP8 base, matriz SDP y degradacion segura a audio |
| R-09 | Fraude telefonico por dialplan abierto | Media | Critico | Contextos cerrados y sin rutas PSTN en laboratorio |
| R-10 | Acceso o retencion indebida de grabaciones | Media | Alta | Volumen no publico, RBAC por CDR y politica de retencion pendiente |

## Requisitos de logging seguro

Se permite registrar actor, rol, extension, accion, resultado, IP tratada,
timestamp UTC y correlation ID. Se prohibe registrar contrasenas, `Authorization`,
cookies, secretos SIP/TURN, claves privadas y SDP completo sin redaccion.

## Riesgo residual aceptado para laboratorio

El soporte SIP UDP 5060 se conserva por requisito de compatibilidad, aunque no
ofrece confidencialidad. Debe estar limitado a red de laboratorio y claramente
diferenciado del camino recomendado SIP TLS/SRTP.
