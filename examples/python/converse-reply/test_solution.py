import boto3
import pytest
from botocore.stub import Stubber

from solution import ask

MODEL = "anthropic.claude-haiku"
SYSTEM = "Ayudas a escribirle notas a Claire Redfield, tu pareja."


def converse_response(blocks, stop_reason="end_turn", total_tokens=42):
    return {
        "output": {"message": {"role": "assistant", "content": blocks}},
        "stopReason": stop_reason,
        "usage": {"inputTokens": 30, "outputTokens": total_tokens - 30, "totalTokens": total_tokens},
        "metrics": {"latencyMs": 120},
    }


def expected_request(prompt):
    return {
        "modelId": MODEL,
        "system": [{"text": SYSTEM}],
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {"maxTokens": 512, "temperature": 0.2},
    }


@pytest.fixture
def bedrock():
    client = boto3.client("bedrock-runtime", region_name="us-east-1")
    with Stubber(client) as stubber:
        yield client, stubber
        stubber.assert_no_pending_responses()


def test_sends_the_converse_request(bedrock):
    """manda modelId, system, el mensaje del usuario y inferenceConfig"""
    client, stubber = bedrock
    prompt = "Escribe una nota de aniversario para Claire"
    stubber.add_response("converse", converse_response([{"text": "Claire, feliz aniversario"}]), expected_request(prompt))
    assert ask(client, MODEL, SYSTEM, prompt)["text"] == "Claire, feliz aniversario"


def test_joins_every_text_block(bedrock):
    """une todos los bloques de texto sin separador"""
    client, stubber = bedrock
    blocks = [{"text": "Claire, "}, {"text": "te espero afuera de la oficina de TerraSave."}]
    stubber.add_response("converse", converse_response(blocks), expected_request("Cita con Claire"))
    assert ask(client, MODEL, SYSTEM, "Cita con Claire")["text"] == "Claire, te espero afuera de la oficina de TerraSave."


def test_reads_stop_reason(bedrock):
    """regresa el stopReason, max_tokens cuando el modelo se quedó sin espacio"""
    client, stubber = bedrock
    response = converse_response([{"text": "Querida Claire, desde"}], stop_reason="max_tokens")
    stubber.add_response("converse", response, expected_request("Una carta larga"))
    assert ask(client, MODEL, SYSTEM, "Una carta larga")["stop_reason"] == "max_tokens"


def test_reads_total_tokens(bedrock):
    """regresa el total de tokens que costó la respuesta"""
    client, stubber = bedrock
    stubber.add_response("converse", converse_response([{"text": "Playlist lista"}], total_tokens=57), expected_request("Arma nuestra playlist"))
    assert ask(client, MODEL, SYSTEM, "Arma nuestra playlist")["tokens"] == 57


def test_calls_bedrock_once(bedrock):
    """llama a converse una sola vez por pregunta"""
    client, stubber = bedrock
    stubber.add_response("converse", converse_response([{"text": "Sí, y Leon cubre tu turno"}]), expected_request("¿Cenamos?"))
    ask(client, MODEL, SYSTEM, "¿Cenamos?")
