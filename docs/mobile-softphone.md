# Prueba con celular

## Preparar la PC

El celular y la PC deben estar en la misma red Wi-Fi. Desde PowerShell:

```powershell
cd "C:\Users\jheis\OneDrive\Desktop\Universidad\Calidad de Software\proyecto asterik"
powershell -ExecutionPolicy Bypass -File .\scripts\configure_mobile_lab.ps1
```

Si el celular no registra, abrir PowerShell como Administrador y ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure_mobile_lab.ps1 -ConfigureFirewall
```

## Cuentas para la demostracion

Usar cuentas distintas permite llamar entre los dos celulares:

| Dispositivo | Usuario/autenticacion | Secreto local |
|---|---|---|
| iPhone | `1001` | `SIP_1001_SECRET` de `.env` |
| Android | `1002` | `SIP_1002_SECRET` de `.env` |

No usar la contrasena web de los agentes: la cuenta web y la cuenta SIP son
credenciales diferentes. No registrar los secretos en capturas o en Git.

## Linphone en iPhone

1. Instalar **Linphone** desde App Store y permitir Red local, Microfono y Camara.
2. Seleccionar `Utilice una cuenta SIP de terceros`.
3. Completar usuario `1001`, clave `SIP_1001_SECRET` y dominio con la IP LAN
   mostrada por el script seguida del puerto, por ejemplo `10.0.0.20:15060`.
4. Usar nombre para mostrar `iPhone 1001` y transporte `UDP`.
5. En configuracion avanzada, usar como proxy
   `sip:<IP-PC>:<PUERTO>;transport=udp`, dejar proxy saliente desactivado y
   habilitar el registro.
6. Para voz, habilitar PCMU/ulaw y PCMA/alaw. Para video, habilitar H.264 y VP8.
7. Usar RTP sin cifrado solo para esta prueba SIP local. TLS con certificado
   autofirmado puede ser rechazado por iOS.

## Linphone en Android

1. Instalar **Linphone** desde Google Play y permitir Red local, Microfono y Camara.
2. Abrir el asistente y elegir `Usar una cuenta SIP` o cuenta de terceros.
3. Completar usuario y usuario de autenticacion `1002`, clave
   `SIP_1002_SECRET` y dominio `<IP-PC>:<PUERTO>`.
4. Usar nombre para mostrar `Android 1002`, transporte `UDP` y proxy
   `sip:<IP-PC>:<PUERTO>;transport=udp`.
5. Dejar proxy saliente vacio, habilitar registro y desactivar IPv6 si la red
   del laboratorio solo entrega IPv4.
6. Para voz, habilitar PCMU/ulaw y PCMA/alaw. Para video, habilitar H.264 y VP8.

Si Linphone solo muestra un campo Dominio, escribir la IP y el puerto juntos.
No usar `localhost`: desde el celular, `localhost` se refiere al propio telefono.

## Realizar la llamada

1. Confirmar que iPhone 1001 y Android 1002 muestran estado registrado.
2. Desde el iPhone marcar `1002`; contestar en Android y validar audio en ambos sentidos.
3. Desde Android marcar `1001` y repetir la prueba en sentido inverso.
4. En la PC, iniciar sesion como `agente1`, pulsar `Conectar SIP` y marcar `1001`
   o `1002` para probar WebRTC contra el celular.
5. Para video, iniciar una `Videollamada` desde la web, contestar y activar la
   camara en Linphone. Ambos extremos deben negociar H.264 o VP8; Asterisk no
   transcodifica video.
6. Finalizar, actualizar el historial y verificar un CDR con estado `ANSWERED`.

Durante la prueba se puede observar el registro con:

```powershell
docker compose exec asterisk asterisk -rx "pjsip show contacts"
```

## Problemas comunes

- `Offline`: pulsar `Conectar SIP` y permitir el microfono.
- `Timeout`: revisar IP, puerto, Wi-Fi y firewall.
- Registra pero no hay audio: revisar el rango RTP y volver a ejecutar el script.
- Registra, pero el video queda negro: iniciar una llamada de video, permitir la
  camara y comprobar H.264/VP8 en ambos extremos.
- Error de cifrado: para esta cuenta tradicional seleccionar RTP sin cifrado;
  WebRTC mantiene DTLS-SRTP de forma independiente.
- La IP de la PC cambia al cambiar de Wi-Fi o hotspot; volver a ejecutar el script
  y actualizar Dominio/Proxy en ambos telefonos.
- Si la PC usa el hotspot del mismo celular, el hotspot puede aislar al telefono
  de sus clientes. Usar un router Wi-Fi comun o un segundo celular.
