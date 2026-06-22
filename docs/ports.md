# Puertos y protocolos

| Puerto | Protocolo | Servicio | Uso |
|---:|---|---|---|
| 80 | TCP/HTTP | Nginx | Redireccion a HTTPS |
| 443 | TCP/HTTPS/WSS | Nginx | Frontend, API y SIP WebSocket |
| 5060 | UDP/SIP | Asterisk | Softphones tradicionales, solo laboratorio |
| 5061 | TCP/SIP TLS | Asterisk | Softphones protegidos |
| 10000-10100 | UDP/RTP/SRTP | Asterisk | Medios de llamada |
| 3478 | UDP/TCP STUN/TURN | coturn | Descubrimiento y relay |
| 5349 | UDP/TCP TURN TLS | coturn | Relay protegido |
| 49160-49200 | UDP | coturn | Puertos de relay |
| 8080 | TCP/HTTP | midPoint | Administracion IAM local |
| 9000 | TCP/HTTP | SonarQube | Perfil QA opcional |
| 5038 | TCP/AMI interno | Asterisk | Eventos hacia FastAPI; nunca publicado al host |

PostgreSQL, backend, frontend y HTTP interno de Asterisk no se publican al host.
Todos los puertos host se pueden cambiar con variables `HOST_*` de `.env`; los
puertos internos de los contenedores permanecen iguales.
