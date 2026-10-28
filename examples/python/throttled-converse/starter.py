def converse_with_backoff(client, request: dict, attempts: int, sleep, base_delay: float = 0.5) -> dict:
    """Llama a client.converse(**request), reintentando con backoff exponencial ante ThrottlingException."""
    raise NotImplementedError
