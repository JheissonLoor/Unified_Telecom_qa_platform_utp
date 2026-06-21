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

## Configurar el softphone

Instalar Zoiper, Linphone o MicroSIP compatible. Crear una cuenta SIP manual:

- Usuario y usuario de autenticacion: `1002`.
- Dominio/servidor: la IP LAN mostrada por el script.
- Puerto: el puerto SIP UDP mostrado por el script.
- Transporte: UDP para esta prueba de laboratorio.
- Contrasena: valor local `SIP_1002_SECRET` de `.env`.
- Proxy saliente: vacio.

No usar la contrasena web de `agente2`: la cuenta web y la cuenta SIP son
credenciales diferentes.

## Realizar la llamada

1. En la PC, iniciar sesion como `agente1` y pulsar `Conectar SIP`.
2. Confirmar que la estacion 2001 cambia de `Offline` a `Online`.
3. En el celular, confirmar que la cuenta 1002 aparece registrada.
4. Desde el celular marcar `2001`, o desde la web marcar `1002`.
5. Aceptar la llamada, hablar en ambos sentidos y finalizar.
6. Pulsar `Actualizar` en el historial y verificar `ANSWERED`.

La videollamada no se prueba con un softphone SIP tradicional. Para video se
requieren dos clientes WebRTC o un softphone que negocie los codecs compatibles.

## Problemas comunes

- `Offline`: pulsar `Conectar SIP` y permitir el microfono.
- `Timeout`: revisar IP, puerto, Wi-Fi y firewall.
- Registra pero no hay audio: revisar el rango RTP y volver a ejecutar el script.
- Si la PC usa el hotspot del mismo celular, el hotspot puede aislar al telefono
  de sus clientes. Usar un router Wi-Fi comun o un segundo celular.
