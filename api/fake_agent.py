"""AGENT_IMPL=fake: Yurko without an LLM. Picks the demo fixture for the message, but performs its actions
through the real tools, so receipts, webhooks and the console behave as in the real demo."""

from contracts._kit import load_fixture, registry
from contracts.agent import AgentInput, AgentOutput, Message, Verdict
from contracts.tools import (
    ActionReceipt,
    CancelSubscriptionArgs,
    FindCustomerArgs,
    RefundPaymentArgs,
)

MODEL = "fake"


def run(inp: AgentInput) -> AgentOutput:
    if inp.trigger == "receipt_update":
        return _receipt_update(inp)
    if inp.trigger == "human_decision":
        return _human_decision(inp)
    return _from_fixture(inp, _case(inp))


def _case(inp: AgentInput) -> str:
    text = inp.messages[-1].text.lower()
    if "system:" in text:
        return "injection_block"
    found = registry()["find_customer"](FindCustomerArgs(email=inp.customer_email))
    if not found.found:
        return "not_found"
    name = found.customer.id.removeprefix("cus_")
    if name == "alex":
        return "alex_block"
    if name == "john":
        return "question" if "how do i" in text else "john_escalate"
    if name == "marta" and (any(p.refunded_amount for p in found.customer.payments) or "again" in text):
        return "marta_again_block"
    return "marta"


def _from_fixture(inp: AgentInput, case: str) -> AgentOutput:
    out = load_fixture(AgentOutput, case)
    renamed: dict[str, str] = {}
    actions = []
    for r in out.actions:
        try:
            new = _perform(inp.ticket_id, r)
        except ValueError:  # already canceled / refunded: billing refuses, as it should
            continue
        renamed[r.id] = new.id
        actions.append(new)
    verdicts = [_rename(v, renamed, inp) for v in out.verdicts if v.hook != "after_action"]  # webhooks add those
    return out.model_copy(update={
        "ticket_id": inp.ticket_id,
        "actions": actions,
        "verdicts": verdicts,
        "reply": out.reply and out.reply.model_copy(update={"at": inp.now}),
    })


def _perform(ticket_id: str, r: ActionReceipt) -> ActionReceipt:
    tools = registry()
    if r.action == "cancel_subscription":
        return tools["cancel_subscription"](CancelSubscriptionArgs(ticket_id=ticket_id, subscription_id=r.target_id))
    return tools["refund_payment"](RefundPaymentArgs(ticket_id=ticket_id, payment_id=r.target_id,
                                                     amount=r.amount or 0, policy_clause="Terms §6.5.1"))


def _rename(v: Verdict, renamed: dict[str, str], inp: AgentInput) -> Verdict:
    claims = [c.model_copy(update={"receipt_id": renamed.get(c.receipt_id, c.receipt_id)}) for c in v.claims]
    return v.model_copy(update={"receipt_id": renamed.get(v.receipt_id, v.receipt_id), "claims": claims,
                                "at": inp.now})


def _reply(inp: AgentInput, text: str) -> Message:
    return Message(id="m0", role="yurko", text=text, at=inp.now, model=MODEL)


def _receipt_update(inp: AgentInput) -> AgentOutput:
    failed = [r for r in inp.receipts if r.status == "failed"]
    if failed:
        return AgentOutput(ticket_id=inp.ticket_id, status="escalated", model=MODEL, reply=_reply(
            inp, "Billing could not complete your refund, so nothing has been sent yet. "
                 "A colleague is taking over and will write to you."))
    if any(r.status == "pending" for r in inp.receipts):
        return AgentOutput(ticket_id=inp.ticket_id, status="waiting_billing", model=MODEL)
    refunds = [r for r in inp.receipts if r.action == "refund_payment"]
    text = "Your cancellation is confirmed by billing; you won't be charged again."
    if refunds:
        r = refunds[-1]
        text = f"Good news: your refund of {r.amount:.2f} {r.currency} is confirmed by the bank."
    return AgentOutput(ticket_id=inp.ticket_id, status="resolved", model=MODEL, reply=_reply(inp, text))


def _human_decision(inp: AgentInput) -> AgentOutput:
    if not (inp.decision and inp.decision.approve and inp.pending_action):
        return AgentOutput(ticket_id=inp.ticket_id, status="resolved", model=MODEL, reply=_reply(
            inp, "A colleague reviewed your request: this payment can't be refunded under our policy. "
                 "Your subscription stays cancelled, so you won't be charged again."))
    p = inp.pending_action
    receipt = registry()["refund_payment"](RefundPaymentArgs(
        ticket_id=inp.ticket_id, payment_id=p.payment_id or "", amount=p.amount or 0,
        policy_clause=p.policy_clause))
    out = load_fixture(AgentOutput, "john_approved")
    return out.model_copy(update={
        "ticket_id": inp.ticket_id,
        "actions": [receipt],
        "verdicts": [v.model_copy(update={"at": inp.now}) for v in out.verdicts],
        "reply": out.reply and out.reply.model_copy(update={"at": inp.now}),
    })
