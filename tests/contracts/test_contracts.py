"""Contract v1 checks. These pass from the start; keep them green after every contracts/ change."""

import sys
from pathlib import Path

import pytest

from contracts._kit import load_fixture
from contracts.agent import AGENT_IO, AgentOutput, EventLog
from contracts.api import ENDPOINTS, ChatRequest
from contracts.tools import TOOLS, Customer

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))


def test_fixtures_match_contracts():
    from gen_contracts import check, load

    assert check(*load()) == []


def test_every_tool_arg_is_described_for_the_llm():
    for name, (args, _result, description) in TOOLS.items():
        assert description, name
        for field, info in args.model_fields.items():
            assert info.description, f"{name}.{field} needs Field(description=...)"


def test_agent_io_is_set():
    assert AGENT_IO is not None


@pytest.mark.parametrize("name, region, platform", [
    ("marta", "EU", "web"), ("john", "US", "web"), ("alex", "US", "app_store")])
def test_demo_customers(name, region, platform):
    c = load_fixture(Customer, name)
    assert c.region == region and c.subscription.platform == platform


@pytest.mark.parametrize("case", ["marta", "john", "alex", "injection", "marta_again", "question", "not_found"])
def test_demo_inputs_exist(case):
    assert load_fixture(ChatRequest, case).text


@pytest.mark.parametrize("case", ["ok", "marta_followup", "john_escalate", "john_approved", "alex_block",
                                  "injection_block", "marta_again_block", "question", "not_found"])
def test_agent_output_cases_for_web(case):
    out = load_fixture(AgentOutput, case)
    assert out.model and out.ticket_id


def test_event_log_is_ordered():
    events = load_fixture(EventLog, "demo").events
    assert events == sorted(events, key=lambda e: e.at)


def test_endpoints_are_unique():
    keys = [(e.method, e.path) for e in ENDPOINTS]
    assert len(keys) == len(set(keys))
