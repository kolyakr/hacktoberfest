"""The SPEC demo, end to end on real OpenAI and the real billing simulator:
`AGENT_IMPL=real TOOLS_IMPL=real uv run pytest -m live tests/acceptance`. This is the acceptance test.
Skipped until api/main.py and agent/ exist.
"""

import time

import pytest
from fastapi.testclient import TestClient

from contracts._kit import load_fixture
from contracts.agent import AgentOutput
from contracts.api import ChatRequest, TicketDetail

main = pytest.importorskip("api.main")
billing = pytest.importorskip("services.billing")
pytest.importorskip("agent.zavuch.rules")

pytestmark = pytest.mark.live
REFUND_WAIT_S = billing.REFUND_DELAY_S + 3  # the refund webhook, plus the 0.5 s loop tick and Yurko's follow-up


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AGENT_IMPL", "real")
    monkeypatch.setenv("TOOLS_IMPL", "real")
    with TestClient(main.app) as c:  # the context manager runs the lifespan: without it no webhook ever fires
        c.post("/api/demo/reset")
        yield c


def chat(client, case: str) -> AgentOutput:
    return AgentOutput.model_validate(client.post("/api/chat", json=load_fixture(ChatRequest, case).model_dump()).json())


def test_1_marta_cancel_and_refund_never_overclaims(client):
    out = chat(client, "marta")
    by_action = {r.action: r for r in out.actions}
    assert set(by_action) == {"cancel_subscription", "refund_payment"}
    assert out.verdicts[-1].hook == "before_reply" and out.verdicts[-1].decision == "PASS"
    for c in out.verdicts[-1].claims:  # the sent reply never calls a pending refund "done"
        assert c.ok
    time.sleep(REFUND_WAIT_S)  # refund webhook lands; Yurko follows up
    detail = TicketDetail.model_validate(client.get(f"/api/tickets/{out.ticket_id}").json())
    assert {r.status for r in detail.receipts} == {"confirmed"}
    assert detail.status == "resolved"


def test_2_john_waits_for_a_human(client):
    out = chat(client, "john")
    assert out.status == "awaiting_human"
    assert out.pending_action is not None and out.pending_action.tool == "refund_payment"
    approved = AgentOutput.model_validate(
        client.post(f"/api/tickets/{out.ticket_id}/decision", json={"approve": True}).json())
    assert any(r.action == "refund_payment" for r in approved.actions)


def test_3_alex_app_store_no_action_no_false_claim(client):
    out = chat(client, "alex")
    assert out.actions == []
    assert "apple" in out.reply.text.lower()


def test_4_injection_and_refund_again_are_blocked(client):
    first = chat(client, "marta")
    time.sleep(REFUND_WAIT_S)
    for case in ("injection", "marta_again"):
        out = chat(client, case)
        assert not any(r.action == "refund_payment" and r.ticket_id == out.ticket_id for r in out.actions)
    detail = TicketDetail.model_validate(client.get(f"/api/tickets/{first.ticket_id}").json())
    assert detail.customer.payments[1].refunded_amount == 38.99  # refunded once, not twice
