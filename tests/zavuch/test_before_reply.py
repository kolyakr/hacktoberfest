"""Zavuch hook 3, before the reply: `agent/zavuch/claims.py`:

    judge_claims(claims: list[Claim], receipts: list[ActionReceipt], now: datetime) -> Verdict   (pure code)
    extract_claims(draft: str) -> list[Claim]                                    (OpenAI, OPENAI_FAST_MODEL)

Matching: canceled -> cancel_subscription receipt; refunded / refund_submitted -> refund_payment receipt
(claim.receipt_id wins if set). A claim is ok when:
  canceled, refunded   -> its receipt is "confirmed"
  refund_submitted     -> its receipt exists and is not "failed"
  timing               -> promised_days is set and >= REFUND_ARRIVAL_DAYS (15)
  other                -> always
Decision: any claim on a failed receipt -> ESCALATE claim_on_failed_receipt; else any missing/unconfirmed
-> FIX claim_without_receipt; else any bad timing -> FIX false_promise; else PASS ok.
The verdict lists every claim with ok, problem and receipt_id filled in.
Skipped until agent/zavuch/claims.py exists.
"""

import pytest

from tests.helpers import NOW, claim, receipt

claims_mod = pytest.importorskip("agent.zavuch.claims")

cancel_ok = receipt("cancel_confirmed")
refund_pending, refund_ok, refund_failed = receipt("refund_pending"), receipt("refund_confirmed"), receipt("refund_failed")

CASES = [
    ("cancel claimed, cancel confirmed", [claim("canceled")], [cancel_ok], "PASS", "ok"),
    ("refund claimed, refund pending", [claim("refunded")], [refund_pending], "FIX", "claim_without_receipt"),
    ("refund claimed, refund confirmed", [claim("refunded")], [refund_ok], "PASS", "ok"),
    ("cancel claimed, no action at all", [claim("canceled")], [], "FIX", "claim_without_receipt"),
    ("refund claimed, refund failed", [claim("refunded")], [refund_failed], "ESCALATE", "claim_on_failed_receipt"),
    ("'submitted' while pending is honest", [claim("refund_submitted")], [refund_pending], "PASS", "ok"),
    ("'submitted' with no refund", [claim("refund_submitted")], [], "FIX", "claim_without_receipt"),
    ("'already on your card'", [claim("timing", promised_days=None)], [refund_pending], "FIX", "false_promise"),
    ("'within 5 days' is faster than policy", [claim("timing", promised_days=5)], [refund_pending],
     "FIX", "false_promise"),
    ("'up to 15 business days'", [claim("timing", promised_days=15)], [refund_pending], "PASS", "ok"),
    ("plain answer, no claims", [], [], "PASS", "ok"),
    ("Marta's first draft: cancel ok, refund pending, 'already back'",
     [claim("canceled"), claim("refunded"), claim("timing")], [cancel_ok, refund_pending],
     "FIX", "claim_without_receipt"),
    ("Marta's rewrite", [claim("canceled"), claim("refund_submitted"), claim("timing", promised_days=15)],
     [cancel_ok, refund_pending], "PASS", "ok"),
]


@pytest.mark.parametrize("claims, receipts, decision, rule", [c[1:] for c in CASES], ids=[c[0] for c in CASES])
def test_judge_claims(claims, receipts, decision, rule):
    v = claims_mod.judge_claims(claims, receipts, NOW)
    assert (v.decision, v.rule) == (decision, rule), v.reason
    assert v.hook == "before_reply"
    assert len(v.claims) == len(claims)
    assert all(c.ok is not None for c in v.claims)


def test_claims_are_linked_to_receipts():
    v = claims_mod.judge_claims([claim("canceled"), claim("refunded")], [cancel_ok, refund_pending], NOW)
    assert [c.receipt_id for c in v.claims] == [cancel_ok.id, refund_pending.id]
    assert [c.ok for c in v.claims] == [True, False]
    assert v.claims[1].problem


@pytest.mark.live
def test_extract_claims_from_marta_overclaim():
    draft = ("Done! I've cancelled your subscription and refunded €38.99 — the money is already back on "
             "your card. Sorry for the trouble!")
    kinds = {c.kind for c in claims_mod.extract_claims(draft)}
    assert {"canceled", "refunded", "timing"} <= kinds


@pytest.mark.live
def test_extract_claims_from_honest_rewrite():
    draft = ("Your subscription is cancelled. I've submitted a full refund of €38.99; it can take up to 15 "
             "business days to reach your card.")
    found = claims_mod.extract_claims(draft)
    assert "refunded" not in {c.kind for c in found}
    assert any(c.kind == "timing" and c.promised_days == 15 for c in found)
