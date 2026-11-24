# Backoff exponencial ante throttling

## Qué es

Throttling es cuando un servicio te dice "vas demasiado rápido" y rechaza la llamada. En Bedrock llega como `ThrottlingException`. Backoff exponencial es la forma de reintentar sin empeorar las cosas: esperas antes de cada reintento, y cada espera dura el doble que la anterior.

Existe porque reintentar de inmediato manda más carga justo al servicio que ya está saturado. Esperar cada vez más le da aire para recuperarse.

## Cómo funciona

- Las esperas siguen `base * 2**intento`: con `base = 1` son 1, 2, 4, 8 segundos.
- Solo vale reintentar los errores temporales, los que pueden salir bien si esperas (`ThrottlingException`, `ServiceUnavailableException`). Uno de permisos o de validación fallaría igual cada vez.
- En boto3 los errores del servicio llegan como `botocore.exceptions.ClientError`, y el tipo exacto vive en `error.response["Error"]["Code"]`.
- Hay un número máximo de intentos. Si el último también falla, el error se vuelve a lanzar para que quien llamó se entere.
- Después del último intento no se espera: ya no hay nada que reintentar.
- Recibir `sleep` como parámetro es inyectar el reloj: en producción pasas `time.sleep` y en los tests una función que solo anota las esperas.
- Si muchos clientes fallan juntos y esperan exactamente lo mismo, vuelven a llegar juntos. Por eso se suele sumar un poco de azar a cada espera, que se llama jitter, para repartirlos en el tiempo.

## Ejemplos

Las esperas que produce el backoff:

```python
[1 * 2**intento for intento in range(4)]
# [1, 2, 4, 8]
```

Cada número es el doble del anterior.

Decidir si un error se reintenta, mirando su código:

```python
TEMPORALES = {"ThrottlingException", "ServiceUnavailableException"}

def es_temporal(error):
    return error.response["Error"]["Code"] in TEMPORALES

# ThrottlingException -> True, AccessDeniedException -> False
```

Inyectar el reloj para ver las esperas sin esperar de verdad:

```python
esperas = []
def reloj_falso(segundos):
    esperas.append(segundos)

reloj_falso(1); reloj_falso(2)
# esperas == [1, 2], y la prueba tardó 0 segundos
```

## Errores típicos

- Reintentar cualquier error, incluso `AccessDeniedException`, que nunca se va a arreglar solo.
- Esperar también después del último intento: tiempo perdido antes de fallar igual.
- Tragarse el error final y regresar `None`:

  ```python
  except ClientError:
      return None  # mal: quien llama cree que todo salió bien
  except ClientError:
      raise        # bien: el error llega a quien sabe qué hacer con él
  ```

## Para pensar

Si mil clientes reciben throttling al mismo tiempo y todos esperan exactamente lo mismo, ¿qué pasa en el siguiente reintento, y por qué el jitter lo evita?
