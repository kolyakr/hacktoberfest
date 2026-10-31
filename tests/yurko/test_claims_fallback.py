"""agent/claims_fallback.py: Zavuch's claim extractor until zavuch-5 lands. Same two cases as
tests/zavuch/test_before_reply.py so both implementations are held to the same bar. Live only."""

import pytest

fallback = pytest.importorskip("agent.claims_fallback")

pytestmark = pytest.mark.live


def test_overclaim_yields_canceled_refunded_and_timing():
    draft = ("Done! I've cancelled your subscription and refunded €38.99 — the money is already back on "
             "your card. Sorry for the trouble!")
    found = fallback.extract_claims(draft)
    assert {"canceled", "refunded", "timing"} <= {c.kind for c in found}
    assert any(c.kind == "timing" and c.promised_days is None for c in found)  # "already" = no days promised
    assert all(c.ok is None and c.receipt_id is None for c in found)  # judging is left to the code


def test_honest_rewrite_has_no_refunded_claim():
    draft = ("Your subscription is cancelled. I've submitted a full refund of €38.99; it can take up to 15 "
             "business days to reach your card.")
    found = fallback.extract_claims(draft)
    assert "refunded" not in {c.kind for c in found}
    assert "refund_submitted" in {c.kind for c in found}
    assert any(c.kind == "timing" and c.promised_days == 15 for c in found)
