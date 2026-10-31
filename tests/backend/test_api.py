"""The real API: `api/main.py: app`. Runs on AGENT_IMPL=fake, so it needs no LLM.
Every endpoint in contracts/api.py must exist and return its contract. Skipped until api/main.py exists."""

import pytest
from fastapi.testclient import TestClient

from contracts._kit import load_fixture
from contracts.agent import AgentOutput, OlyaReport
from contracts.api import ENDPOINTS, ChatRequest, DemoReset, TicketDetail, TicketList, WebhookAck
from contracts.tools import BillingWebhook

main = pytest.importorskip("api.main")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AGENT_IMPL", "fake")
    monkeypatch.setenv("TOOLS_IMPL", "real")
    c = TestClient(main.app)
    c.post("/api/demo/reset")
    return c


def test_health(client):
    assert client.get("/health").json()["ok"] is True


def test_every_contract_endpoint_exists():
    routes = {(m, r.path) for r in main.app.routes for m in getattr(r, "methods", ())}
    for ep in ENDPOINTS:
        assert (ep.method, ep.path) in routes, f"{ep.method} {ep.path}"


def test_chat_returns_agent_output(client):
    body = load_fixture(ChatRequest, "marta").model_dump()
    out = AgentOutput.model_validate(client.post("/api/chat", json=body).json())
    assert out.ticket_id and out.model


def test_ticket_appears_in_console(client):
    out = client.post("/api/chat", json=load_fixture(ChatRequest, "marta").model_dump()).json()
    tickets = TicketList.model_validate(client.get("/api/tickets").json()).tickets
    assert out["ticket_id"] in {t.id for t in tickets}
    detail = TicketDetail.model_validate(client.get(f"/api/tickets/{out['ticket_id']}").json())
    assert detail.messages[0].role == "customer"


def test_unknown_ticket_is_404(client):
    assert client.get("/api/tickets/T-0000").status_code == 404


def test_same_webhook_twice_is_a_duplicate(client):
    event = load_fixture(BillingWebhook, "refund_succeeded").model_dump(mode="json")
    client.post("/webhooks/billing", json=event)
    second = WebhookAck.model_validate(client.post("/webhooks/billing", json=event).json())
    assert second.duplicate is True


def test_report_and_reset(client):
    OlyaReport.model_validate(client.get("/api/report").json())
    assert DemoReset.model_validate(client.post("/api/demo/reset").json()).customers == 3
