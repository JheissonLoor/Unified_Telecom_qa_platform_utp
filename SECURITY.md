# Politica de seguridad

Este repositorio contiene un laboratorio academico y no debe utilizarse como
servicio productivo sin PKI corporativa, alta disponibilidad, hardening y una
revision formal de seguridad.

## Reporte de vulnerabilidades

No publiques credenciales, datos personales ni una prueba de explotacion en un
issue. Reporta el hallazgo de forma privada mediante GitHub Security Advisories
del repositorio, indicando componente, impacto, pasos de reproduccion y una
propuesta de mitigacion.

## Secretos

- `.env`, certificados privados y configuraciones generadas estan excluidos de Git.
- Solo se permiten usuarios, extensiones y credenciales sinteticas de laboratorio.
- Un secreto expuesto debe revocarse y rotarse; eliminar solo el archivo no basta.

Las versiones soportadas y el dictamen vigente se documentan en
`docs/qa_report.md`.
