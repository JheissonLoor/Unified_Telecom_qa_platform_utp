# Matriz de riesgos

| ID | Riesgo | P | I | Nivel | Respuesta |
|---|---|---:|---:|---|---|
| R-01 | Credencial SIP expuesta | 4 | 5 | Critico | Secreto individual, TLS, redaccion y rotacion |
| R-02 | AMI/BD expuestos | 2 | 5 | Alto | Sin puertos host y redes internas |
| R-03 | Bypass RBAC | 3 | 5 | Critico | Dependencias backend y pruebas 403 |
| R-04 | SIP UDP interceptado | 4 | 4 | Critico | Solo laboratorio; TLS/SRTP recomendado |
| R-05 | Aprovisionamiento malicioso | 3 | 4 | Alto | Token tecnico, esquema estricto e idempotencia |
| R-06 | Secretos en logs | 3 | 5 | Critico | Campos permitidos y escaneo |
| R-07 | Imagen vulnerable | 4 | 4 | Critico | Etiquetas, Trivy y actualizacion documentada |
| R-08 | Video incompatible | 4 | 3 | Alto | VP8 base y degradacion a audio |
| R-09 | Recursos insuficientes | 4 | 3 | Alto | Perfiles QA y memoria midPoint documentada |
| R-10 | Certificado local no confiable | 5 | 2 | Medio | CA local exportada y validacion de hostname |
| R-11 | Regresion de cobertura automatizada | 2 | 4 | Alto | LCOV/Cobertura, Sonar y umbral obligatorio de 80% |
| R-12 | Registro de dependencias temporalmente no disponible | 2 | 3 | Medio | Reintento de npm audit y Trivy compensatorio |

Escala: probabilidad e impacto de 1 a 5. La aceptacion final requiere responsable,
fecha y riesgo residual para todo riesgo alto o critico no mitigado.
