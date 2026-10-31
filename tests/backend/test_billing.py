"""Billing simulator: `services/billing.py: BillingSim`. A fake Solidgate-style billing with webhooks.

    sim = BillingSim.from_fixtures(now)                    # Customer.marta / john / alex fixtures
    sim.find_customer(email) -> Customer | None
    sim.cancel(ticket_id, subscription_id) -> ActionReceipt          # status "pending"
    sim.refund(ticket_id, payment_id, amount) -> ActionReceipt       # status "pending"; ValueError if > paid
    sim.status(receipt_id) -> ActionReceipt                          # read-back
    sim.deliver_due(at) -> list[BillingWebhook]                      # settles what is due by `at`
    sim.fail_next_refund = True                                      # demo switch: next refund fails

Webhooks are due CANCEL_DELAY_S (1 s) and REFUND_DELAY_S (10 s) after the action. The clock is passed in,
so tests are instant; the server runs deliver_due(now) in a loop and POSTs each event to /webhooks/billing.
Idempotency key: f"{ticket_id}:{action}:{target_id}"; the same key returns the same receipt.
Skipped until services/billing.py exists.
"""

from datetime import timedelta

import pytest

from tests.helpers import NOW

billing = pytest.importorskip("services.billing")


@pytest.fixture
def sim():
    return billing.BillingSim.from_fixtures(NOW)


def test_find_customer(sim):
    assert sim.find_customer("marta.k@example.com").country == "DE"
    assert sim.find_customer("unknown@example.com") is None


def test_cancel_is_pending_then_confirmed(sim):
    r = sim.cancel("T-1042", "sub_marta")
    assert r.status == "pending" and r.idempotency_key == "T-1042:cancel_subscription:sub_marta"
    events = sim.deliver_due(NOW + timedelta(seconds=1))
    assert [e.type for e in events] == ["subscription.canceled"]
    assert sim.status(r.id).status == "confirmed"
    assert sim.find_customer("marta.k@example.com").subscription.status == "canceled"


def test_refund_takes_ten_seconds(sim):
    r = sim.refund("T-1042", "pay_marta_1", 38.99)
    assert sim.deliver_due(NOW + timedelta(seconds=1)) == []
    assert sim.status(r.id).status == "pending"
    events = sim.deliver_due(NOW + timedelta(seconds=10))
    assert [e.type for e in events] == ["refund.succeeded"]
    assert events[0].idempotency_key == r.idempotency_key
    assert sim.status(r.id).status == "confirmed"
    assert sim.find_customer("marta.k@example.com").payments[1].refunded_amount == 38.99


def test_retry_does_not_refund_twice(sim):
    first = sim.refund("T-1042", "pay_marta_1", 38.99)
    second = sim.refund("T-1042", "pay_marta_1", 38.99)
    assert first.id == second.id
    sim.deliver_due(NOW + timedelta(seconds=10))
    assert sim.find_customer("marta.k@example.com").payments[1].refunded_amount == 38.99


def test_refund_more_than_paid_is_refused(sim):
    with pytest.raises(ValueError):
        sim.refund("T-1042", "pay_marta_1", 500.0)


def test_failing_refund(sim):
    sim.fail_next_refund = True
    r = sim.refund("T-1042", "pay_marta_1", 38.99)
    events = sim.deliver_due(NOW + timedelta(seconds=10))
    assert [e.type for e in events] == ["refund.failed"]
    assert sim.status(r.id).status == "failed"
    assert sim.find_customer("marta.k@example.com").payments[1].refunded_amount == 0.0


def test_event_ids_are_unique_and_delivered_once(sim):
    sim.cancel("T-1042", "sub_marta")
    sim.refund("T-1042", "pay_marta_1", 38.99)
    events = sim.deliver_due(NOW + timedelta(seconds=10))
    assert len({e.event_id for e in events}) == 2
    assert sim.deliver_due(NOW + timedelta(seconds=20)) == []
