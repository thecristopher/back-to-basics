# Backoff exponencial ante throttling

Cuando un servicio te limita, reintentar de inmediato empeora las cosas. El backoff exponencial espera cada vez más: `base`, `base * 2`, `base * 4`... así le das aire al servicio.

```python
for attempt in range(intentos):
    try:
        return llamar()
    except ErrorTemporal:
        if attempt == intentos - 1:
            raise
        sleep(base * 2**attempt)
```

En boto3 los errores del servicio llegan como `botocore.exceptions.ClientError`, y el tipo exacto está en `error.response["Error"]["Code"]`. Solo vale la pena reintentar los temporales (`ThrottlingException`, `ServiceUnavailableException`), nunca uno de permisos o validación, que fallaría igual.

Recibir `sleep` como parámetro es inyectar el reloj: en producción pasas `time.sleep` y en los tests una función que solo anota las esperas.

## Errores típicos
- Reintentar cualquier error, incluso `AccessDeniedException`.
- Esperar también después del último intento.
- Tragarse el error final y regresar `None`.

## Para pensar
Si mil clientes reciben throttling al mismo tiempo y todos esperan exactamente lo mismo, ¿qué pasa en el siguiente reintento? Busca qué es el jitter.
