from botocore.exceptions import ClientError

RETRYABLE = "ThrottlingException"


def _is_throttled(error: ClientError) -> bool:
    return error.response["Error"]["Code"] == RETRYABLE


def converse_with_backoff(client, request: dict, attempts: int, sleep, base_delay: float = 0.5) -> dict:
    """Llama a client.converse(**request), reintentando con backoff exponencial ante ThrottlingException."""
    for attempt in range(attempts):
        try:
            return client.converse(**request)
        except ClientError as error:
            last_attempt = attempt == attempts - 1
            if last_attempt or not _is_throttled(error):
                raise
            sleep(base_delay * 2**attempt)
