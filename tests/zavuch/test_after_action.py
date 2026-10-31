"""Zavuch hook 2, after an action: `agent/zavuch/receipts.py`:

    apply_webhook(receipt: ActionReceipt, event: BillingWebhook, readback: ActionReceipt,
                  seen_event_ids: set[str]) -> tuple[ActionReceipt, Verdict]

`readback` is what billing says now (tool get_action_status). A receipt becomes "confirmed" only when the
webhook AND the read-back agree. Pure code. The verdict's `at` is the event's created_at.
Skipped until agent/zavuch/receipts.py exists.
"""

import pytest

from contracts._kit import load_fixture
from contracts.tools import BillingWebhook
from tests.helpers import receipt

receipts = pytest.importorskip("agent.zavuch.receipts")

pending = receipt("refund_pending")
succeeded = load_fixture(BillingWebhook, "refund_succeeded")
failed_event = load_fixture(BillingWebhook, "refund_failed")


def test_refund_confirmed_when_webhook_and_readback_agree():
    new, v = receipts.apply_webhook(pending, succeeded, receipt("refund_confirmed"), set())
    assert new.status == "confirmed"
    assert succeeded.event_id in new.evidence
    assert (v.hook, v.decision, v.rule, v.receipt_id) == ("after_action", "PASS", "webhook_confirmed", pending.id)


def test_refund_failed_goes_to_a_human():
    new, v = receipts.apply_webhook(pending, failed_event, receipt("refund_failed"), set())
    assert new.status == "failed"
    assert (v.decision, v.rule) == ("ESCALATE", "webhook_failed")


def test_duplicate_event_changes_nothing():
    new, v = receipts.apply_webhook(pending, succeeded, receipt("refund_confirmed"), {succeeded.event_id})
    assert new == pending
    assert (v.decision, v.rule) == ("PASS", "duplicate_event")


def test_webhook_without_readback_stays_pending():
    new, v = receipts.apply_webhook(pending, succeeded, pending, set())
    assert new.status == "pending"
    assert (v.decision, v.rule) == ("BLOCK", "readback_mismatch")


def test_cancel_confirmed():
    cancel_pending = receipt("cancel_confirmed").model_copy(update={"status": "pending", "evidence": []})
    event = load_fixture(BillingWebhook, "cancel")
    new, v = receipts.apply_webhook(cancel_pending, event, receipt("cancel_confirmed"), set())
    assert new.status == "confirmed" and v.rule == "webhook_confirmed"


def test_event_for_another_receipt_is_rejected():
    other = succeeded.model_copy(update={"idempotency_key": "T-9999:refund_payment:pay_x"})
    with pytest.raises(ValueError):
        receipts.apply_webhook(pending, other, receipt("refund_confirmed"), set())
