# Scripts

Comandos idempotentes para arranque, health checks, pruebas y evidencia:

- `bootstrap.ps1`: genera `.env` y certificados de laboratorio.
- `smoke_test.ps1`: valida servicios, HTTPS, PJSIP y PostgreSQL.
- `run_quality.ps1`: lint, build, npm audit, pruebas y cobertura >=80%.
- `run_sipp_call.ps1`: llamada 1001-1002, RTP bidireccional y CDR.
- `configure_mobile_lab.ps1`: prepara IP LAN, RTP y firewall opcional para un celular.
- `run_trivy.ps1`: vulnerabilidades, secretos y configuraciones inseguras.
- `run_sonarqube.ps1`: token efimero, escaneo, gate y resumen.
