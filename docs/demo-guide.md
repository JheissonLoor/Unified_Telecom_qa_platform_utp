# Guion de demostracion

1. Ejecutar bootstrap y levantar Compose.
2. Mostrar health checks y endpoints PJSIP sin revelar secretos.
3. Registrar softphones 1001/1002 y completar una llamada.
4. Entrar como agente1 y agente2 en navegadores separados.
5. Conectar SIP y demostrar llamada entrante con aceptar/rechazar y No Molestar.
6. Llamar 2001-2002 y probar mute, retencion/reanudacion, DTMF y transferencia.
7. Entrar con ambos agentes a la videoconferencia 702 y mostrar video remoto;
   despues demostrar la conferencia de voz 700.
8. Mostrar CDR filtrado, WAV reproducible, MOS y auditoria correlacionada.
9. Entrar como supervisor para monitoreo, evaluaciones y exportacion PDF; como admin QA
   mostrar auditoria y gestion de usuarios.
10. Importar roles/usuario sintetico en midPoint y sincronizar 2003.
11. Probar que un agente recibe 403 al acceder a endpoints QA/auditoria.
12. Mostrar TLS/WSS, DTLS-SRTP, pruebas, Trivy, SonarQube y riesgos residuales.

La grabacion debe ocultar `.env`, cabeceras, cookies, passwords SIP/TURN y claves.
