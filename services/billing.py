"""BillingSim: a fake Solidgate-style billing. Actions return a pending receipt; a webhook settles it later.

The clock is injected: tests pass a fixed `now`, the server passes real time. Nothing here calls an LLM.
"""

import os
from collections.abc import Callable
from datetime import datetime, timedelta

from contracts._kit import load_fixture
from contracts.tools import (
    ActionName,
    ActionReceipt,
    BillingWebhook,
    Customer,
    Payment,
    Subscription,
)

CANCEL_DELAY_S = 1
# The bank's answer to a refund. The demo video sets BILLING_REFUND_DELAY_S=20 so the receipt is still 🟡 when
# Yurko's first reply lands, and turns 🟢 on screen afterwards.
REFUND_DELAY_S = float(os.getenv("BILLING_REFUND_DELAY_S", "10"))
DEMO_CUSTOMERS = ("marta", "john", "alex")


class BillingSim:
    def __init__(self, customers: list[Customer], clock: Callable[[], datetime]):
        self._customers = {c.email.lower(): c.model_copy(deep=True) for c in customers}
        self._clock = clock
        self._receipts: dict[str, ActionReceipt] = {}
        self._by_key: dict[str, str] = {}  # idempotency_key -> receipt id
        self._due: dict[str, datetime] = {}  # receipt id -> when its webhook fires
        self._will_fail: set[str] = set()  # receipt ids whose refund will fail
        self._seq = 0
        self.fail_next_refund = False

    @classmethod
    def from_fixtures(cls, now: datetime, clock: Callable[[], datetime] | None = None) -> "BillingSim":
        """The 3 demo customers. Without `clock`, every action happens at `now` (tests)."""
        return cls([load_fixture(Customer, name) for name in DEMO_CUSTOMERS], clock or (lambda: now))

    # --- reads ------------------------------------------------------------------------------------

    def customer_count(self) -> int:
        return len(self._customers)

    def find_customer(self, email: str) -> Customer | None:
        c = self._customers.get(email.strip().lower())
        return c.model_copy(deep=True) if c else None

    def status(self, receipt_id: str) -> ActionReceipt:
        """Read-back: billing's own view of the receipt."""
        if receipt_id not in self._receipts:
            raise KeyError(f"unknown receipt {receipt_id}")
        return self._receipts[receipt_id].model_copy(deep=True)

    def receipt_for_key(self, idempotency_key: str) -> ActionReceipt | None:
        rid = self._by_key.get(idempotency_key)
        return self.status(rid) if rid else None

    # --- actions ----------------------------------------------------------------------------------

    def cancel(self, ticket_id: str, subscription_id: str) -> ActionReceipt:
        key = f"{ticket_id}:cancel_subscription:{subscription_id}"
        if key in self._by_key:
            return self.status(self._by_key[key])
        sub = self._subscription(subscription_id)
        if sub.platform != "web":
            raise ValueError(f"{subscription_id} was bought on {sub.platform}; only the store can cancel it")
        if sub.status == "canceled":
            raise ValueError(f"{subscription_id} is already canceled")
        return self._submit(ticket_id, "cancel_subscription", subscription_id, key, CANCEL_DELAY_S,
                            billing_ref=subscription_id)

    def refund(self, ticket_id: str, payment_id: str, amount: float) -> ActionReceipt:
        key = f"{ticket_id}:refund_payment:{payment_id}"
        if key in self._by_key:
            return self.status(self._by_key[key])
        owner, pay = self._payment(payment_id)
        if owner.subscription and owner.subscription.platform != "web":
            raise ValueError(f"{payment_id} was paid on {owner.subscription.platform}; only the store can refund it")
        if amount <= 0 or amount > round(pay.amount - pay.refunded_amount, 2):
            raise ValueError(f"refund {amount} exceeds what is left of {payment_id} "
                             f"({pay.amount - pay.refunded_amount:.2f} {pay.currency})")
        self._seq += 1
        r = self._submit(ticket_id, "refund_payment", payment_id, key, REFUND_DELAY_S,
                         billing_ref=f"re_{self._seq}", amount=amount, currency=pay.currency)
        if self.fail_next_refund:
            self._will_fail.add(r.id)
            self.fail_next_refund = False
        return r

    # --- webhooks ---------------------------------------------------------------------------------

    def deliver_due(self, at: datetime) -> list[BillingWebhook]:
        """Settle every pending action whose webhook is due by `at`; return the events, oldest first."""
        events = []
        for rid, due in sorted(self._due.items(), key=lambda kv: kv[1]):
            if due > at:
                continue
            del self._due[rid]
            events.append(self._settle(self._receipts[rid], due))
        return events

    # --- internals --------------------------------------------------------------------------------

    def _submit(self, ticket_id: str, action: ActionName, target_id: str, key: str, delay_s: int,
                billing_ref: str, amount: float | None = None, currency: str | None = None) -> ActionReceipt:
        self._seq += 1
        now = self._clock()
        r = ActionReceipt(id=f"rcp_{self._seq}", ticket_id=ticket_id, action=action, target_id=target_id,
                          amount=amount, currency=currency, idempotency_key=key, status="pending",
                          billing_ref=billing_ref, created_at=now, updated_at=now)
        self._receipts[r.id] = r
        self._by_key[key] = r.id
        self._due[r.id] = now + timedelta(seconds=delay_s)
        return r.model_copy(deep=True)

    def _settle(self, r: ActionReceipt, at: datetime) -> BillingWebhook:
        self._seq += 1
        if r.action == "cancel_subscription":
            self._subscription(r.target_id).status = "canceled"
            r.status, kind = "confirmed", "subscription.canceled"
        elif r.id in self._will_fail:
            r.status, r.failure_reason, kind = "failed", "card issuer declined the refund", "refund.failed"
        else:
            _, pay = self._payment(r.target_id)
            pay.refunded_amount = round(pay.refunded_amount + (r.amount or 0), 2)
            r.status, kind = "confirmed", "refund.succeeded"
        r.updated_at = at
        return BillingWebhook(event_id=f"evt_{self._seq}", type=kind, object_id=r.billing_ref or r.target_id,
                              idempotency_key=r.idempotency_key, created_at=at)

    def _subscription(self, subscription_id: str) -> Subscription:
        for c in self._customers.values():
            if c.subscription and c.subscription.id == subscription_id:
                return c.subscription
        raise ValueError(f"unknown subscription {subscription_id}")

    def _payment(self, payment_id: str) -> tuple[Customer, Payment]:
        for c in self._customers.values():
            for p in c.payments:
                if p.id == payment_id:
                    return c, p
        raise ValueError(f"unknown payment {payment_id}")
