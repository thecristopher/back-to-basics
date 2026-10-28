# La Converse API de Bedrock

`converse` es la forma única de hablar con cualquier modelo de Amazon Bedrock. El request siempre tiene la misma forma, sin importar el proveedor del modelo:

```python
client.converse(
    modelId="anthropic.claude-haiku",
    system=[{"text": "Respondes corto."}],
    messages=[{"role": "user", "content": [{"text": "¿Qué hierba cura más?"}]}],
    inferenceConfig={"maxTokens": 256, "temperature": 0},
)
```

`content` es una lista de bloques, no un string: un mensaje puede traer texto, imágenes, `toolUse` o `toolResult`. La respuesta trae el mensaje en `output.message`, la razón de parar en `stopReason` (`end_turn`, `max_tokens`, `tool_use`...) y el costo en `usage`.

Para probarlo sin AWS, `botocore.stub.Stubber` intercepta el cliente: `add_response` define lo que contesta y, con `expected_params`, también revisa que el request sea exactamente el esperado.

## Errores típicos
- Leer `content[0]["text"]` y perder el resto de los bloques, o tronar cuando el primero es un `toolUse`.
- Mandar `system` o `content` como string en lugar de lista de bloques.
- Ignorar `stopReason` y tratar una respuesta cortada por `max_tokens` como completa.

## Para pensar
¿Cómo calcularías el costo en dólares de cada llamada con `usage` si el precio de entrada y el de salida son distintos?
