"""STORE=supabase: `api/mirror.py` copies tickets, actions and events into the Supabase tables.
Rows must fit supabase/migrations (status checks) and be written parent-first (audit_log has foreign keys).
No network: the writer queue is captured."""

import pytest
from fastapi.testclient import TestClient

from contracts._kit import load_fixture
from contracts.api import ChatRequest

main = pytest.importorskip("api.main")
mirror = pytest.importorskip("api.mirror")

TICKET = {"open", "proposed", "approved", "resolved", "escalated"}
ACTION = {"proposed", "approved", "executed", "confirmed", "failed", "blocked"}
MODE = {"auto", "ask", "never"}


@pytest.fixture
def rows(monkeypatch):
    monkeypatch.setenv("AGENT_IMPL", "fake")
    monkeypatch.setenv("TOOLS_IMPL", "real")
    monkeypatch.setenv("STORE", "supabase")
    captured = []
    monkeypatch.setattr(mirror, "_queue_put",
                        lambda method, table, body, params=None, prefer="": captured.append((method, table, body)))
    c = TestClient(main.app)
    c.post("/api/demo/reset")
    john = c.post("/api/chat", json=load_fixture(ChatRequest, "john").model_dump()).json()
    c.post(f"/api/tickets/{john['ticket_id']}/decision", json={"approve": True, "agent_name": "Olena"})
    c.post("/api/chat", json=load_fixture(ChatRequest, "alex").model_dump())
    return captured


def test_reset_wipes_first(rows):
    assert rows[0][:2] == ("DELETE", "tickets")


def test_rows_fit_the_schema_and_come_parent_first(rows):
    tickets, actions = set(), set()
    for _, table, b in rows[1:]:
        if table == "tickets":
            assert b["status"] in TICKET and b["channel"] == "web" and "@" not in b["customer_ref"]
            tickets.add(b["id"])
        elif table == "actions":
            assert b["ticket_id"] in tickets
            assert b["status"] in ACTION and b["mode"] in MODE
            actions.add(b["id"])
        else:
            assert b["ticket_id"] in tickets, b["event"]
            assert b["action_id"] is None or b["action_id"] in actions, b["event"]


def test_human_approval_and_blocks_are_recorded(rows):
    final = {b["id"]: b for _, table, b in rows if table == "actions"}
    assert any(a["tool"] == "refund_payment" and a["approved_by"] == "Olena" and a["mode"] == "ask"
               for a in final.values())
    assert sum(a["status"] == "blocked" and a["mode"] == "never" for a in final.values()) == 2
