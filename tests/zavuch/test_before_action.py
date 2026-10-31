"""Zavuch hook 1, before an action: `agent/zavuch/rules.py: before_action(ctx: ActionContext) -> Verdict`.

Pure code, no LLM. Rules are checked in this order; the first that matches wins:
  injection -> intent_mismatch -> not_found -> store_purchase -> already_canceled / already_refunded
  -> amount_exceeds_payment -> refund: EU and <= 14 days ? PASS eu_withdrawal_14d : ESCALATE outside_policy
  -> cancel: PASS ok
Intent match: cancel needs "cancel" or "refund" in intents (a refund request means "stop charging me");
refund needs "refund".
Skipped until agent/zavuch/rules.py exists.
"""

import pytest

from tests.helpers import NOW, cancel, charged_days_ago, ctx, customer, receipt, refund, wants

rules = pytest.importorskip("agent.zavuch.rules")

marta, john, alex = customer("marta"), customer("john"), customer("alex")
marta_refunded = marta.model_copy(deep=True)
marta_refunded.payments[1].refunded_amount = 38.99
marta_canceled = marta.model_copy(deep=True)
marta_canceled.subscription.status = "canceled"

CASES = [
    # (id, context, decision, rule)
    ("marta refund: EU, web, 4 days", ctx(marta, wants("cancel", "refund"), refund("pay_marta_1", 38.99)),
     "PASS", "eu_withdrawal_14d"),
    ("marta cancel: web, active", ctx(marta, wants("cancel", "refund"), cancel("sub_marta")), "PASS", "ok"),
    ("john refund: US, 20 days", ctx(john, wants("refund"), refund("pay_john_1", 38.99)),
     "ESCALATE", "outside_policy"),
    ("john cancel while refund is reviewed", ctx(john, wants("refund"), cancel("sub_john")), "PASS", "ok"),
    ("alex refund: App Store", ctx(alex, wants("refund", "cancel"), refund("pay_alex_2", 9.99)),
     "BLOCK", "store_purchase"),
    ("alex cancel: App Store", ctx(alex, wants("refund", "cancel"), cancel("sub_alex")),
     "BLOCK", "store_purchase"),
    ("refund again: payment already refunded", ctx(marta_refunded, wants("refund"), refund("pay_marta_1", 38.99)),
     "BLOCK", "already_refunded"),
    ("refund again: earlier receipt still pending",
     ctx(marta, wants("refund"), refund("pay_marta_1", 38.99), previous=[receipt("refund_pending")]),
     "BLOCK", "already_refunded"),
    ("refund more than paid", ctx(marta, wants("refund"), refund("pay_marta_1", 500.0)),
     "BLOCK", "amount_exceeds_payment"),
    ("injection wins over a valid refund",
     ctx(marta, wants("refund", injection_suspected=True), refund("pay_marta_1", 38.99)), "BLOCK", "injection"),
    ("asked only to cancel, agent refunds", ctx(marta, wants("cancel"), refund("pay_marta_1", 38.99)),
     "BLOCK", "intent_mismatch"),
    ("only a question, agent cancels", ctx(marta, wants("question"), cancel("sub_marta")),
     "BLOCK", "intent_mismatch"),
    ("cancel an already canceled subscription", ctx(marta_canceled, wants("cancel"), cancel("sub_marta")),
     "BLOCK", "already_canceled"),
    ("payment of another customer", ctx(marta, wants("refund"), refund("pay_john_1", 38.99)),
     "BLOCK", "not_found"),
    ("EU, exactly 14 days", ctx(charged_days_ago(marta, "pay_marta_1", 14), wants("refund"),
                                refund("pay_marta_1", 38.99)), "PASS", "eu_withdrawal_14d"),
    ("EU, 15 days", ctx(charged_days_ago(marta, "pay_marta_1", 15), wants("refund"), refund("pay_marta_1", 38.99)),
     "ESCALATE", "outside_policy"),
]


@pytest.mark.parametrize("context, decision, rule", [c[1:] for c in CASES], ids=[c[0] for c in CASES])
def test_before_action(context, decision, rule):
    v = rules.before_action(context)
    assert (v.decision, v.rule) == (decision, rule), v.reason
    assert v.hook == "before_action"
    assert v.action == context.proposal
    assert v.reason.strip(), "the console shows the reason"


def test_partial_refund_inside_window_passes():
    v = rules.before_action(ctx(marta, wants("refund"), refund("pay_marta_1", 10.0)))
    assert v.decision == "PASS"


def test_verdict_time_is_the_context_time():
    v = rules.before_action(ctx(marta, wants("cancel"), cancel("sub_marta")))
    assert v.at == NOW
