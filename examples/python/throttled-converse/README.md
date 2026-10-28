# Bedrock con backoff

Cuando muchos usuarios le escriben al modelo a la vez, Amazon Bedrock responde con `ThrottlingException`. Escribe `converse_with_backoff(client, request, attempts, sleep, base_delay=0.5)`, que llama a `client.converse(**request)` y reintenta con backoff exponencial.

- Si la llamada funciona, regresa la respuesta tal cual.
- Si falla con `ThrottlingException`, espera con `sleep(segundos)` y vuelve a intentar. La espera se duplica cada vez: `base_delay`, `base_delay * 2`, `base_delay * 4`...
- Como máximo hace `attempts` llamadas. Si la última también falla, relanza ese error sin esperar más.
- Cualquier otro error (`ValidationException`, `AccessDeniedException`...) se relanza de inmediato, sin reintentar.
- Nunca esperes de verdad: usa la función `sleep` que recibes.

```python
response = converse_with_backoff(client, {"modelId": "anthropic.claude-haiku", "messages": messages}, 4, time.sleep)
```
