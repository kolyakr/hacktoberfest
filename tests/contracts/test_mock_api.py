"""`make mock-api` serves what web/ builds against: `ok` by default, `?mock=<case>` or a ticket id for others."""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))


@pytest.fixture(scope="module")
def client():
    from mock_api import build

    return TestClient(build())


def test_default_case(client):
    assert client.post("/api/chat", json={"email": "a@example.com", "text": "hi"}).json()["ticket_id"] == "T-1042"


def test_query_case(client):
    out = client.post("/api/chat?mock=alex_block", json={"email": "a@example.com", "text": "hi"}).json()
    assert out["verdicts"][0]["rule"] == "store_purchase"


def test_ticket_id_case(client):
    assert client.get("/api/tickets/T-1043").json()["status"] == "awaiting_human"


def test_empty_states(client):
    assert client.get("/api/tickets?mock=empty").json()["tickets"] == []
    assert client.get("/api/report?mock=empty").json()["tickets_total"] == 0
