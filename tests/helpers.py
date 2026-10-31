"""Shared test builders. Demo data comes from contracts/fixtures (one source of truth)."""

from datetime import UTC, datetime, timedelta

from contracts._kit import load_fixture
from contracts.agent import ActionContext, Claim, Classification, ProposedAction
from contracts.tools import ActionReceipt, Customer

NOW = datetime(2026, 10, 31, 10, 0, tzinfo=UTC)  # the demo's "today"


def customer(name: str) -> Customer:
    """marta (DE, web, charged 4 days ago), john (US, web, 20 days), alex (US, App Store)."""
    return load_fixture(Customer, name)


def wants(*intents: str, **flags) -> Classification:
    return Classification(intents=list(intents), true_goal="test", **flags)


def refund(payment_id: str, amount: float, clause: str = "Terms §6.5.1") -> ProposedAction:
    return ProposedAction(tool="refund_payment", payment_id=payment_id, amount=amount,
                          policy_clause=clause, reason="test")


def cancel(subscription_id: str) -> ProposedAction:
    return ProposedAction(tool="cancel_subscription", subscription_id=subscription_id,
                          policy_clause="Membership Policy: cancellation", reason="test")


def ctx(cust: Customer, cls: Classification, proposal: ProposedAction,
        now: datetime = NOW, previous: list[ActionReceipt] | None = None) -> ActionContext:
    return ActionContext(ticket_id="T-TEST", classification=cls, customer=cust, proposal=proposal,
                         now=now, previous_receipts=previous or [])


def charged_days_ago(cust: Customer, payment_id: str, days: float) -> Customer:
    """A copy of the customer whose payment was charged `days` before NOW."""
    out = cust.model_copy(deep=True)
    for p in out.payments:
        if p.id == payment_id:
            p.charged_at = NOW - timedelta(days=days)
    return out


def receipt(case: str) -> ActionReceipt:
    """refund_pending, refund_confirmed, refund_failed, cancel_confirmed (all ticket T-1042, Marta)."""
    return load_fixture(ActionReceipt, case)


def claim(kind: str, text: str = "test", promised_days: int | None = None) -> Claim:
    return Claim(text=text, kind=kind, promised_days=promised_days)
