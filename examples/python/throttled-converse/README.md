# Bedrock con backoff

## La historia

La app donde Ada Wong te deja mensajes cifrados le pregunta cosas a un modelo en Amazon Bedrock. Cuando muchas personas le escriben al modelo al mismo tiempo, Bedrock no se cae: te responde con un error `ThrottlingException`, que significa "estoy saturado, intenta en un momento". Una app seria no se rinde ahí. Espera un poco y vuelve a intentar, y cada vez espera más para no saturarlo de nuevo. Eso se llama backoff exponencial.

## Qué vas a construir

Una función llamada `converse_with_backoff`:

```python
def converse_with_backoff(client, request: dict, attempts: int, sleep, base_delay: float = 0.5) -> dict: ...
```

- `client` es el cliente de Bedrock de boto3. Llamas al modelo con `client.converse(**request)`.
- `request` es un dict con los argumentos de esa llamada (`modelId`, `messages`...).
- `attempts` es el número máximo de llamadas que puedes hacer en total.
- `sleep` es la función con la que esperas, recibe segundos. Te la pasan para que los tests no esperen de verdad.
- `base_delay` es la primera espera, en segundos.
- Regresa la respuesta de `client.converse` en cuanto una llamada funcione.

## Cómo se comporta

- Si la llamada funciona, regresas la respuesta tal cual, sin esperar.
- Si falla con `ThrottlingException`, esperas con `sleep` y vuelves a intentar. La espera se duplica cada vez: `0.5`, luego `1.0`, luego `2.0` con el `base_delay` por defecto.
- Haces como máximo `attempts` llamadas. Si la última también falla, relanzas ese error sin esperar otra vez.
- Cualquier otro error, como `ValidationException` o `AccessDeniedException`, se relanza de inmediato: reintentar no lo arregla.
- Nunca llames `time.sleep` tú: usa la función `sleep` que recibes.

## Un ejemplo paso a paso

```python
response = converse_with_backoff(client, {"modelId": "anthropic.claude-haiku", "messages": messages}, 4, time.sleep)

# si Bedrock contesta a la primera, no espera nada:
waits = []
converse_with_backoff(client, REQUEST, 3, waits.append)  # REPLY
# y waits == []
```

Supón que Bedrock falla con throttling dos veces y a la tercera responde. Primera llamada: throttling, esperas `0.5`. Segunda llamada: throttling, esperas `1.0`. Tercera llamada: funciona y regresas su respuesta. Usaste 3 de los 4 intentos y esperaste 2 veces.

## Lo que vas a usar

boto3 lanza `botocore.exceptions.ClientError` para cualquier error que regresa AWS, y el tipo concreto viene adentro como texto. Un ejemplo con otro servicio:

```python
try:
    s3.get_object(Bucket="cartas", Key="claire.txt")
except ClientError as error:
    if error.response["Error"]["Code"] == "NoSuchKey":
        print("esa carta no existe")
```
