"""Offline tests for the conductor `agent.run()`: Yurko's model calls are stubbed, tools are fake.

Live behaviour (real classify / plan / draft) is in test_yurko.py and tests/acceptance.
"""

from types import SimpleNamespace

import pytest

from contracts.agent import AgentInput, HumanDecision, Message, Verdict
from tests.helpers import NOW, cancel, receipt, refund, wants

agent = pytest.importorskip("agent")
yurko = pytest.importorskip("agent.yurko")

MARTA = "marta.k@example.com"


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    """Fake tools, no settle pause, no Zavuch module, a draft that echoes Zavuch's feedback."""
    monkeypatch.setenv("TOOLS_IMPL", "fake")
    monkeypatch.setattr(agent, "SETTLE_SECONDS", 0)
    monkeypatch.setattr(agent, "zavuch_rules", None)
    monkeypatch.setattr(agent, "zavuch_claims", None)
    monkeypatch.setattr(yurko, "draft_reply", lambda facts, feedback=None: f"DRAFT[{feedback or 'first'}]")


def inp(**kw) -> AgentInput:
    base = dict(ticket_id="T-1042", trigger="customer_message", customer_email=MARTA, now=NOW,
                messages=[Message(id="m1", role="customer", text="hi", at=NOW)])
    return AgentInput(**{**base, **kw})


def judge_sequence(monkeypatch, *decisions: str):
    """A stand-in Zavuch claims module whose judge_claims answers the given decisions in turn."""
    answers = iter(decisions)

    def judge(claims, receipts, now):
        d = next(answers)
        rule = "ok" if d == "PASS" else "claim_without_receipt" if d == "FIX" else "claim_on_failed_receipt"
        return Verdict(hook="before_reply", decision=d, rule=rule, reason=f"zavuch says {d}", at=now)

    monkeypatch.setattr(agent, "zavuch_claims", SimpleNamespace(extract_claims=lambda draft: [], judge_claims=judge))


def test_cancel_and_refund_run_through_both_hooks(monkeypatch):
    monkeypatch.setattr(yurko, "classify", lambda msgs: wants("cancel", "refund"))
    monkeypatch.setattr(yurko, "plan_actions", lambda cls, c, t: [cancel("sub_marta"), refund("pay_marta_1", 38.99)])
    out = agent.run(inp())
    assert [(v.hook, v.decision) for v in out.verdicts] == [("before_action", "PASS")] * 2 + [("before_reply", "PASS")]
    assert len(out.actions) == 2 and out.reply.text == "DRAFT[first]"
    assert out.status == "waiting_billing"  # the fake receipt is pending
    assert out.model == agent.llm.BIG and out.reply.model == agent.llm.BIG


def test_question_only_takes_no_action(monkeypatch):
    monkeypatch.setattr(yurko, "classify", lambda msgs: wants("question"))
    monkeypatch.setattr(yurko, "plan_actions", lambda *a: pytest.fail("no planning for a question"))
    out = agent.run(inp())
    assert out.actions == [] and out.status == "resolved" and out.reply is not None


def test_wants_human_is_escalated(monkeypatch):
    monkeypatch.setattr(yurko, "classify", lambda msgs: wants("other", wants_human=True))
    out = agent.run(inp())
    assert out.status == "escalated" and out.actions == [] and out.reply is not None


def test_missing_zavuch_fails_closed_on_real_tools(monkeypatch):
    monkeypatch.setenv("TOOLS_IMPL", "real")
    v = agent.missing_zavuch("before_action", NOW, cancel("sub_marta"))
    assert v.decision == "ESCALATE" and v.action == cancel("sub_marta")
    monkeypatch.setenv("TOOLS_IMPL", "fake")
    assert agent.missing_zavuch("before_reply", NOW).decision == "PASS"


def test_fix_rewrites_then_passes(monkeypatch):
    monkeypatch.setattr(yurko, "classify", lambda msgs: wants("question"))
    judge_sequence(monkeypatch, "FIX", "FIX", "PASS")
    out = agent.run(inp())
    assert out.rejected_drafts == ["DRAFT[first]", "DRAFT[zavuch says FIX]"]
    assert out.reply.text == "DRAFT[zavuch says FIX]" and out.verdicts[-1].decision == "PASS"
    assert out.status == "resolved"


def test_three_fixes_hand_to_human(monkeypatch):
    monkeypatch.setattr(yurko, "classify", lambda msgs: wants("question"))
    judge_sequence(monkeypatch, "FIX", "FIX", "FIX")
    out = agent.run(inp())
    assert out.reply is None and len(out.rejected_drafts) == 3 and out.status == "escalated"


def test_human_approves_pending_refund():
    pending = refund("pay_john_1", 38.99)
    out = agent.run(inp(trigger="human_decision", pending_action=pending, decision=HumanDecision(approve=True)))
    assert len(out.actions) == 1 and out.reply is not None and out.pending_action is None
    assert not any(v.hook == "before_action" for v in out.verdicts)  # a human allowed it, Zavuch is not asked


def test_human_declines_pending_refund():
    out = agent.run(inp(trigger="human_decision", pending_action=refund("pay_john_1", 38.99),
                        decision=HumanDecision(approve=False, note="outside the 14-day window")))
    assert out.actions == [] and out.reply is not None and out.status == "resolved"


def test_receipt_update_speaks_only_when_final():
    done = agent.run(inp(trigger="receipt_update", receipts=[receipt("cancel_confirmed"), receipt("refund_confirmed")]))
    assert done.reply is not None and done.status == "resolved" and len(done.actions) == 2

    partial = agent.run(inp(trigger="receipt_update", receipts=[receipt("cancel_confirmed"), receipt("refund_pending")]))
    assert partial.reply is None and partial.status == "waiting_billing"

    failed = agent.run(inp(trigger="receipt_update", receipts=[receipt("cancel_confirmed"), receipt("refund_failed")]))
    assert failed.status == "escalated" and failed.reply is not None
