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


def test_fake_agent_uses_real_billing_whatever_tools_impl(monkeypatch):
    """AGENT_IMPL=fake must tell customers apart even when TOOLS_IMPL is unset (fake), as in a fresh .env."""
    monkeypatch.setenv("AGENT_IMPL", "fake")
    monkeypatch.setenv("TOOLS_IMPL", "fake")
    c = TestClient(main.app)
    c.post("/api/demo/reset")
    john = c.post("/api/chat", json=load_fixture(ChatRequest, "john").model_dump()).json()
    assert john["status"] == "awaiting_human"
    approved = c.post(f"/api/tickets/{john['ticket_id']}/decision", json={"approve": True}).json()
    assert approved["status"] == "waiting_billing"


def test_chat_returns_the_reply_even_when_billing_moved_during_the_run(client, monkeypatch):
    """A webhook can land while Yurko is still answering (the ticket goes stale and the agent runs again with
    receipt_update). The chat still gets the reply to its message, with the ticket's latest status."""
    flow = pytest.importorskip("api.flow")
    from api import store

    real, calls = flow._agent, []

    def agent(inp):
        out = real(inp)
        calls.append(inp.trigger)
        if len(calls) == 1:
            store.get(inp.ticket_id).stale = True  # as if a webhook arrived mid-run
        else:
            out = out.model_copy(update={"reply": None})  # a follow-up with nothing new to say
        return out

    monkeypatch.setattr(flow, "_agent", agent)
    out = AgentOutput.model_validate(client.post("/api/chat", json=load_fixture(ChatRequest, "marta").model_dump()).json())
    assert calls == ["customer_message", "receipt_update"]
    assert out.reply is not None and out.reply.text
    detail = TicketDetail.model_validate(client.get(f"/api/tickets/{out.ticket_id}").json())
    assert out.status == detail.status


def test_real_report_is_written_once_per_new_events(client, monkeypatch):
    """Olya's real report calls gpt-5: the dashboard may load it often, but it's written again only after new events."""
    flow = pytest.importorskip("api.flow")
    report_mod = pytest.importorskip("agent.olya.report")
    calls = []
    monkeypatch.setattr(report_mod, "report", lambda evs: calls.append(len(evs)) or load_fixture(OlyaReport))
    monkeypatch.setenv("AGENT_IMPL", "real")
    flow.report(), flow.report()
    assert len(calls) == 1
    monkeypatch.setenv("AGENT_IMPL", "fake")
    client.post("/api/chat", json=load_fixture(ChatRequest, "alex").model_dump())
    monkeypatch.setenv("AGENT_IMPL", "real")
    flow.report()
    assert len(calls) == 2
