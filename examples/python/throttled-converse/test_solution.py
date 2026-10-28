import boto3
import pytest
from botocore.exceptions import ClientError
from botocore.stub import Stubber

from solution import converse_with_backoff

REQUEST = {
    "modelId": "anthropic.claude-haiku",
    "messages": [{"role": "user", "content": [{"text": "Planea mi cita con Claire"}]}],
}
REPLY = {
    "output": {"message": {"role": "assistant", "content": [{"text": "Cena en Raccoon City y su playlist compartida"}]}},
    "stopReason": "end_turn",
    "usage": {"inputTokens": 12, "outputTokens": 6, "totalTokens": 18},
    "metrics": {"latencyMs": 80},
}


@pytest.fixture
def bedrock():
    client = boto3.client("bedrock-runtime", region_name="us-east-1")
    with Stubber(client) as stubber:
        yield client, stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def waits():
    return []


def throttle(stubber, times):
    for _ in range(times):
        stubber.add_client_error("converse", service_error_code="ThrottlingException", http_status_code=429)


def test_returns_the_first_good_answer(bedrock, waits):
    """regresa la respuesta sin esperar cuando Bedrock contesta a la primera"""
    client, stubber = bedrock
    stubber.add_response("converse", REPLY, REQUEST)
    assert converse_with_backoff(client, REQUEST, 3, waits.append) == REPLY
    assert waits == []


def test_retries_after_throttling(bedrock, waits):
    """reintenta y regresa la respuesta cuando el throttling pasa"""
    client, stubber = bedrock
    throttle(stubber, 2)
    stubber.add_response("converse", REPLY, REQUEST)
    assert converse_with_backoff(client, REQUEST, 3, waits.append)["stopReason"] == "end_turn"


def test_doubles_the_wait(bedrock, waits):
    """duplica la espera en cada reintento"""
    client, stubber = bedrock
    throttle(stubber, 3)
    stubber.add_response("converse", REPLY, REQUEST)
    converse_with_backoff(client, REQUEST, 4, waits.append, base_delay=0.25)
    assert waits == [0.25, 0.5, 1.0]


def test_gives_up_after_the_last_attempt(bedrock, waits):
    """relanza el throttling cuando se acaban los intentos, sin esperar al final"""
    client, stubber = bedrock
    throttle(stubber, 3)
    with pytest.raises(ClientError, match="ThrottlingException"):
        converse_with_backoff(client, REQUEST, 3, waits.append)
    assert waits == [0.5, 1.0]


def test_other_errors_are_not_retried(bedrock, waits):
    """relanza de inmediato un error que no es throttling, como el acceso negado a Wesker"""
    client, stubber = bedrock
    stubber.add_client_error("converse", service_error_code="AccessDeniedException", http_status_code=403)
    with pytest.raises(ClientError, match="AccessDeniedException"):
        converse_with_backoff(client, REQUEST, 5, waits.append)
    assert waits == []
