# ADR-0001: tecnologia y fronteras de responsabilidad

- Estado: Aceptada
- Fecha: 2026-06-19

## Contexto

El proyecto necesita telefonia tradicional y WebRTC, gobierno de identidades,
API, paneles por rol, persistencia, auditoria y pruebas reproducibles. Debe poder
demostrarse en una sola computadora sin ocultar las diferencias frente a una
plataforma de produccion.

## Decision

Se adopta un monorepo con React/TypeScript/Vite, FastAPI, PostgreSQL, Asterisk
PJSIP, SIP.js, midPoint, coturn y Nginx, orquestados con Docker Compose.

midPoint sera la fuente de gobierno de identidad, asignaciones y roles. No se
usara como si fuera un IdP OIDC: el backend administrara la sesion del prototipo,
aplicara RBAC y expondra un contrato de aprovisionamiento para midPoint.

El acceso del backend a Asterisk sera minimo: AMI para operaciones justificadas
y una estrategia controlada para aprovisionamiento. El CDR se escribira por ODBC
en PostgreSQL; no se inferiran llamadas unicamente desde logs.

## Justificacion

- React y TypeScript favorecen mantenibilidad, tipado y pruebas de UI.
- FastAPI entrega contratos OpenAPI y validacion estricta con poco acoplamiento.
- PostgreSQL soporta integridad, consultas de reporte y acceso ODBC para CDR.
- SIP.js se integra de forma natural con PJSIP sobre WebSocket en navegador.
- Nginx centraliza certificados, WSS, cabeceras y politicas del borde.
- Compose hace repetible la sustentacion y permite health checks por servicio.

## Consecuencias

- Se agregan varios servicios y mayor costo operativo de laboratorio.
- Los secretos de SIP requieren tratamiento especial porque el navegador debe
  autenticarse; se usaran credenciales por extension con alcance minimo.
- El video exige coincidencia de codecs y no garantiza transcodificacion.
- El despliegue inicial carece de alta disponibilidad y recuperacion geografica.

## Alternativas descartadas

- Angular: valido, pero agrega estructura innecesaria para el tamano del equipo.
- JsSIP: viable; SIP.js se elige por su API TypeScript y documentacion del flujo.
- MariaDB: compatible con CDR, pero PostgreSQL unifica el stack de datos elegido.
- Autenticacion directa contra midPoint: acopla usuarios finales a una interfaz
  de administracion/provisionamiento que no es un proveedor OIDC.
