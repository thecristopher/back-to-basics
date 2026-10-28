INFERENCE = {"maxTokens": 512, "temperature": 0.2}


def ask(client, model_id: str, system: str, prompt: str) -> dict:
    """Pregunta prompt al modelo con la Converse API y regresa text, stop_reason y tokens."""
    response = client.converse(
        modelId=model_id,
        system=[{"text": system}],
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig=INFERENCE,
    )
    blocks = response["output"]["message"]["content"]
    return {
        "text": "".join(block["text"] for block in blocks if "text" in block),
        "stop_reason": response["stopReason"],
        "tokens": response["usage"]["totalTokens"],
    }
