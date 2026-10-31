"""Yurko: `agent/yurko.py: classify(messages: list[Message]) -> Classification` (OPENAI_FAST_MODEL) and
`agent/__init__.py: run(inp: AgentInput) -> AgentOutput` (the conductor: classify -> tools -> Zavuch hooks
-> draft (OPENAI_MODEL) -> Zavuch before_reply -> rewrite on FIX, at most 2 times, then ESCALATE).

Tests marked `live` call real OpenAI: `uv run pytest -m live tests/yurko`. Skipped until agent/ exists.
"""

import pytest

from contracts._kit import load_fixture
from contracts.agent import AgentInput, AgentOutput, Message
from contracts.api import ChatRequest
from tests.helpers import NOW

yurko = pytest.importorskip("agent.yurko")


def as_messages(case: str) -> list[Message]:
    return [Message(id="m1", role="customer", text=load_fixture(ChatRequest, case).text, at=NOW)]


@pytest.mark.live
@pytest.mark.parametrize("case, must_have, flag", [
    ("marta", {"cancel", "refund"}, "chargeback_threat"),
    ("john", {"refund"}, None),
    ("alex", {"refund", "cancel"}, None),
    ("injection", set(), "injection_suspected"),
    ("question", {"question"}, None),
])
def test_classify_demo_messages(case, must_have, flag):
    c = yurko.classify(as_messages(case))
    assert must_have <= set(c.intents)
    if flag:
        assert getattr(c, flag) is True


@pytest.mark.live
def test_run_marta_on_fake_tools(monkeypatch):
    """TOOLS_IMPL=fake: every tool returns its ok fixture (Marta). Yurko must not claim an unconfirmed refund."""
    agent = pytest.importorskip("agent")
    monkeypatch.setenv("TOOLS_IMPL", "fake")
    out = agent.run(AgentInput(ticket_id="T-1042", trigger="customer_message", customer_email="marta.k@example.com",
                               messages=as_messages("marta"), now=NOW))
    assert isinstance(out, AgentOutput)
    assert out.reply is not None
    assert out.verdicts and out.verdicts[-1].hook == "before_reply" and out.verdicts[-1].decision == "PASS"
