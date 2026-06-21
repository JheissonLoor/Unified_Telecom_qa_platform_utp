# Contribucion

## Flujo

1. Crear una rama corta desde `main`.
2. Mantener los cambios limitados a una capacidad o correccion.
3. Ejecutar la puerta local con `scripts/run_quality.ps1`.
4. Actualizar requisitos, riesgos, casos y evidencias cuando cambie el comportamiento.
5. Abrir una pull request usando la plantilla del repositorio.

## Criterios de aceptacion

- Cobertura frontend y backend igual o superior a 80%.
- Sin secretos, certificados privados, contrasenas reales ni datos personales.
- Docker Compose valido y servicios modificados con healthcheck.
- Cambios de telefonia probados con SIPp o Playwright segun corresponda.
- Cambios de seguridad trazados contra ISO 27001 y el modelo de amenazas.

Los hallazgos de calidad o seguridad no deben ocultarse reduciendo umbrales ni
excluyendo codigo funcional de los analizadores.
