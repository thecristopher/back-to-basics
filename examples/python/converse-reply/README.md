# Respuesta de Converse

Escribe `ask(client, model_id, system, prompt)`: le pregunta algo a un modelo de Amazon Bedrock con la Converse API de boto3 y regresa lo importante de la respuesta.

Llama a `client.converse` una sola vez con:

- `modelId`: el `model_id` que recibes.
- `system`: una lista con un bloque `{"text": system}`.
- `messages`: un mensaje de `role` `"user"` con un bloque `{"text": prompt}`.
- `inferenceConfig`: `{"maxTokens": 512, "temperature": 0.2}`.

Regresa un dict con:

- `text`: el texto de todos los bloques de la respuesta que lo tengan, unidos sin separador.
- `stop_reason`: el `stopReason` de la respuesta.
- `tokens`: el `totalTokens` de `usage`.

```python
client = boto3.client("bedrock-runtime", region_name="us-east-1")
ask(client, "anthropic.claude-haiku", "Ayudas a escribirle a Claire.", "Una nota para Claire")
# {"text": "Claire, cada playlist...", "stop_reason": "end_turn", "tokens": 42}
```

Los tests simulan Bedrock con `botocore.stub.Stubber`, no hace falta cuenta de AWS.
