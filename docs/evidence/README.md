# Guia de evidencias

Las evidencias generadas se guardan localmente bajo `artifacts/` y no se
confirman por defecto, porque pueden incluir datos de ambiente. El informe final
referenciara versiones redactadas y aprobadas.

## Convencion

`EV-F<fase>-<numero>-<descripcion>-<fecha-UTC>.<extension>`

Ejemplo: `EV-F3-01-registro-pjsip-20260619T220000Z.png`.

## Metadatos obligatorios

- ID de evidencia y requisito/caso relacionado.
- Commit o version evaluada.
- Fecha UTC, ambiente y responsable.
- Pasos ejecutados y resultado esperado/observado.
- Tratamiento aplicado para ocultar secretos y datos personales.

## Evidencias de Fase 1

1. `EV-F1-01`: salida que demuestra el estado inicial vacio.
2. `EV-F1-02`: arbol del repositorio despues de la fase.
3. `EV-F1-03`: validacion de enlaces, marcadores y ausencia de secretos reales.

El acta versionada se encuentra en
[Validacion de Fase 1](phase-1-validation.md).

## Evidencias para el video final

1. Arranque limpio y estado saludable de contenedores.
2. Login y acceso diferenciado para cada rol.
3. Llamada SIP 1001-1002, llamada WebRTC y CDR relacionado.
4. Videollamada y estadisticas de codec, si el ambiente es compatible.
5. Aprovisionamiento desde midPoint y reflejo en Asterisk.
6. Bloqueo RBAC, TLS/WSS/SRTP y logs redactados.
7. Resumen SonarQube, Trivy, pruebas y matriz de calidad.

No grabar contrasenas, tokens, claves, cookies, `Authorization`, secretos SIP o
datos personales. Preparar usuarios sinteticos exclusivamente para la demo.
