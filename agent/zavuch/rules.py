"""Zavuch hook 1, before an action. Pure code, no LLM: money and actions are decided here.

Rules run in order and the first that matches wins (see tests/zavuch/test_before_action.py):
injection -> intent_mismatch -> not_found -> store_purchase -> already_canceled / already_refunded
-> amount_exceeds_payment -> refund: EU and <= 14 days ? PASS : ESCALATE -> cancel: PASS.
"""

from datetime import timedelta

from agent.zavuch import policy
from contracts.agent import ActionContext, Decision, Rule, Verdict
from contracts.tools import Payment


def before_action(ctx: ActionContext) -> Verdict:
    decision, rule, reason = _check(ctx)
    return Verdict(
        hook="before_action",
        decision=decision,
        rule=rule,
        reason=reason,
        action=ctx.proposal,
        at=ctx.now,
    )


def _check(ctx: ActionContext) -> tuple[Decision, Rule, str]:
    p, cls, cust = ctx.proposal, ctx.classification, ctx.customer
    is_refund = p.tool == "refund_payment"
    sub = cust.subscription

    if cls.injection_suspected:
        return (
            "BLOCK",
            "injection",
            "The message tries to give the agent orders; no action is taken.",
        )

    allowed = {"refund"} if is_refund else {"cancel", "refund"}
    if not allowed & set(cls.intents):
        asked = ", ".join(cls.intents) or "nothing"
        return "BLOCK", "intent_mismatch", f"The customer asked for {asked}, not for {p.tool}."

    payment: Payment | None = None
    if is_refund:
        payment = next((x for x in cust.payments if x.id == p.payment_id), None)
        if payment is None:
            return "BLOCK", "not_found", f"Payment {p.payment_id} does not belong to {cust.email}."
    elif sub is None or sub.id != p.subscription_id:
        return (
            "BLOCK",
            "not_found",
            f"Subscription {p.subscription_id} does not belong to {cust.email}.",
        )

    if sub is not None and sub.platform != "web":
        store = policy.STORE_NAMES[sub.platform]
        return (
            "BLOCK",
            "store_purchase",
            f"Bought via {store}: only {store.split(' ')[0]} can cancel or refund it ({policy.STORE_REFUNDS}).",
        )

    if not is_refund:
        if sub.status == "canceled":
            return "BLOCK", "already_canceled", f"Subscription {sub.id} is already canceled."
        return (
            "PASS",
            "ok",
            f"Web subscription {sub.id} is {sub.status}; canceling stops further charges.",
        )

    earlier = [
        r
        for r in ctx.previous_receipts
        if r.action == "refund_payment" and r.target_id == payment.id and r.status != "failed"
    ]
    if payment.refunded_amount > 0 or earlier:
        return (
            "BLOCK",
            "already_refunded",
            f"Payment {payment.id} already has a refund; one refund per transaction ({policy.REFUND_TERMS}).",
        )

    if p.amount is None or p.amount <= 0 or p.amount > payment.amount:
        return (
            "BLOCK",
            "amount_exceeds_payment",
            f"Refund {p.amount} {payment.currency} is not within payment {payment.id} "
            f"({payment.amount} {payment.currency}).",
        )

    age = ctx.now - payment.charged_at
    if cust.region == "EU" and age <= timedelta(days=policy.EU_WITHDRAWAL_DAYS):
        return (
            "PASS",
            "eu_withdrawal_14d",
            f"EU customer, web purchase charged {age.days} days ago: within the "
            f"{policy.EU_WITHDRAWAL_DAYS}-day withdrawal right ({policy.EU_WITHDRAWAL}).",
        )
    return (
        "ESCALATE",
        "outside_policy",
        f"{cust.region} customer, charged {age.days} days ago: web purchases are generally non-refundable, "
        f"a human decides ({policy.MEMBERSHIP_POLICY}).",
    )
