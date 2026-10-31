"""Olya's numbers: `agent/olya/kpis.py: compute(events: list[Event]) -> OlyaReport` (pure code; leaves
top_reason, recommendation and model empty) and `agent/olya/report.py: report(events) -> OlyaReport`
(adds the LLM texts, OPENAI_MODEL).

Definitions (fixtures/EventLog.demo.json has 4 tickets):
  tickets_total            distinct ticket_id with ticket.opened
  resolved_without_human   tickets with ticket.resolved and no handed_to_human
  avg_first_response_s     mean of (first reply.sent - ticket.opened), 1 decimal
  zavuch_caught            hook.verdict events with decision FIX or BLOCK
  false_done_caught        ... with rule claim_without_receipt, claim_on_failed_receipt or false_promise
  escalated                distinct tickets with handed_to_human
  refunded_by_currency     sum of amount of receipt.updated where action=refund_payment and status=confirmed
Skipped until agent/olya/kpis.py exists.
"""

import pytest

from contracts._kit import load_fixture
from contracts.agent import EventLog

kpis = pytest.importorskip("agent.olya.kpis")

events = load_fixture(EventLog, "demo").events


def test_demo_log_numbers():
    r = kpis.compute(events)
    assert r.tickets_total == 4
    assert r.resolved_without_human == 3
    assert r.resolved_without_human_pct == 75.0
    assert r.avg_first_response_s == 8.0  # (9 + 12 + 6 + 5) / 4
    assert r.zavuch_caught == 3  # Marta FIX, Alex BLOCK, injection BLOCK
    assert r.false_done_caught == 1  # Marta's "refunded" while pending
    assert r.escalated == 1  # John
    assert r.refunded_by_currency == {"EUR": 38.99, "USD": 38.99}


def test_empty_log():
    r = kpis.compute([])
    assert (r.tickets_total, r.resolved_without_human_pct, r.avg_first_response_s) == (0, 0.0, 0.0)
    assert r.refunded_by_currency == {}


def test_matches_the_web_fixture():
    from contracts.agent import OlyaReport

    expected = load_fixture(OlyaReport, "ok")
    got = kpis.compute(events)
    keep = {"top_reason", "recommendation", "model"}
    assert got.model_dump(exclude=keep) == expected.model_dump(exclude=keep)


@pytest.mark.live
def test_report_adds_reason_and_recommendation():
    report = pytest.importorskip("agent.olya.report")
    r = report.report(events)
    assert r.top_reason and r.recommendation and r.model
