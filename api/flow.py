"""What each endpoint does. Routes in main.py only call these.

Agent runs happen outside the store lock (an LLM call takes seconds); every ticket change happens inside it.
A webhook that lands while the ticket's agent run is in progress marks the ticket stale; the run's caller
then asks the agent for a receipt_update, so Yurko never talks over himself.
"""

import asyncio
import logging
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI, HTTPException

import services
from api import events, fake_agent, mirror, seed, store
from contracts._kit import impl, load_fixture
from contracts.agent import AgentInput, AgentOutput, HumanDecision, Message, OlyaReport, Verdict
from contracts.api import (
    ChatRequest,
    DemoReset,
    TicketDetail,
    TicketList,
    TicketSummary,
    WebhookAck,
)
from contracts.tools import ActionReceipt, BillingWebhook

log = logging.getLogger("api")
WEBHOOK_TICK_S = 0.5


def now() -> datetime:
    return datetime.now(UTC)


# --- agent runs -------------------------------------------------------------------------------------


def _agent(inp: AgentInput) -> AgentOutput:
    if impl("AGENT_IMPL") == "real":
        from agent import run

        return run(inp)
    return fake_agent.run(inp)


def _input(t: store.Ticket, trigger, at: datetime, decision: HumanDecision | None = None) -> AgentInput:
    return AgentInput(ticket_id=t.id, trigger=trigger, customer_email=t.email, messages=list(t.messages),
                      receipts=list(t.receipts), pending_action=t.pending_action, decision=decision, now=at)


def _run(inp: AgentInput) -> AgentOutput:
    """Run the agent for a ticket already marked busy; apply its output; follow up if billing moved meanwhile."""
    while True:
        try:
            out = _agent(inp)
        except Exception as e:
            with store.LOCK:
                store.get(inp.ticket_id).busy = False
            log.exception("agent run failed for %s", inp.ticket_id)
            raise HTTPException(502, f"agent failed: {e}") from e
        with store.LOCK:
            t = store.get(inp.ticket_id)
            _apply(t, out, now())
            if not t.stale:
                t.busy = False
                return out
            t.stale = False
            inp = _input(t, "receipt_update", now())


def _apply(t: store.Ticket, out: AgentOutput, at: datetime) -> None:
    before = t.status
    merged = [(r, store.merge_receipt(t, r)) for r in out.actions]
    store.apply_output(t, out, at)
    if out.reply:
        store.add_message(t, out.reply)
    _sync(t)  # rows first: audit_log points at tickets and actions
    for r, was in merged:
        events.receipt(t.id, r, was, at)
    events.output(out, before, at)


def _sync(t: store.Ticket) -> None:
    """STORE=supabase: upsert the ticket's row and its action rows (no-op in memory mode)."""
    if not mirror.enabled():
        return
    mirror.ticket(t)
    passed = {}
    for i, v in enumerate(t.verdicts):
        if v.hook != "before_action" or v.action is None:
            continue
        target = v.action.payment_id or v.action.subscription_id
        if v.decision == "PASS":
            passed[(v.action.tool, target)] = v.action.policy_clause
        else:
            mirror.proposal(t.id, f"{t.id}:v{i}", v.action, v,
                            t.approved_by if v.decision == "ESCALATE" else None)
            if v.decision == "ESCALATE":
                passed[(v.action.tool, target)] = v.action.policy_clause
    asked = {(v.action.tool, v.action.payment_id or v.action.subscription_id) for v in t.verdicts
             if v.decision == "ESCALATE" and v.action}
    for r in t.receipts:
        key = (r.action, r.target_id)
        mirror.receipt(t.id, r, passed.get(key), t.approved_by if key in asked else None)


# --- endpoints ----------------------------------------------------------------------------------------


def chat(req: ChatRequest) -> AgentOutput:
    at = now()
    with store.LOCK:
        t = store.get(req.ticket_id) if req.ticket_id else None
        if req.ticket_id and t is None:
            raise HTTPException(404, f"no ticket {req.ticket_id}")
        if t is not None and t.busy:
            raise HTTPException(409, "Yurko is still answering the previous message")
        opened = t is None
        if t is None:
            customer = services.SIM.find_customer(req.email)
            t = store.new(req.email, at, customer.id if customer else None)
        store.add_message(t, Message(id="m0", role="customer", text=req.text, at=at))
        _sync(t)
        if opened:
            events.append(t.id, "ticket.opened", at, detail={"body": req.text})
        t.busy = True
        inp = _input(t, "customer_message", at)
    return _run(inp)


def decide(ticket_id: str, decision: HumanDecision) -> AgentOutput:
    at = now()
    with store.LOCK:
        t = _ticket(ticket_id)
        if t.status != "awaiting_human" or t.pending_action is None or t.busy:
            raise HTTPException(409, f"{ticket_id} is not waiting for a human decision")
        verb = "approved" if decision.approve else "refused"
        store.add_message(t, Message(id="m0", role="human", at=at,
                                     text=f"{decision.agent_name} {verb} the action. {decision.note}".strip()))
        if decision.approve:
            t.approved_by = decision.agent_name
        _sync(t)
        events.append(t.id, "human.decision", at, actor=f"agent:{decision.agent_name}",
                      detail={"note": decision.note}, approve=decision.approve)
        t.busy = True
        inp = _input(t, "human_decision", at, decision)
    return _run(inp)


def webhook(event: BillingWebhook) -> WebhookAck:
    with store.LOCK:
        if store.seen(event.event_id):
            return WebhookAck(ok=True, duplicate=True)
        seen_before = store.seen_events()
        store.mark_seen(event.event_id)
        billed = services.SIM.receipt_for_key(event.idempotency_key)
        t = store.get(billed.ticket_id) if billed else None
        if t is None:
            log.warning("webhook %s matches no ticket receipt; acknowledged", event.event_id)
            return WebhookAck(ok=True)
        current = store.receipt_by_key(t, event.idempotency_key) or _as_submitted(billed)
        new, verdict = _apply_webhook(current, event, services.SIM.status(billed.id), seen_before)
        before = store.merge_receipt(t, new)
        t.verdicts.append(verdict)
        t.updated_at = now()
        _sync(t)
        events.receipt(t.id, new, before, event.created_at)
        events.verdict(t.id, verdict)
        if new.status == before:
            return WebhookAck(ok=True, receipt=new)
        if t.busy:
            t.stale = True
            return WebhookAck(ok=True, receipt=new)
        t.busy = True
        inp = _input(t, "receipt_update", now())
    _run(inp)
    return WebhookAck(ok=True, receipt=new)


def tickets() -> TicketList:
    with store.LOCK:
        return TicketList(tickets=[_summary(t) for t in store.all_tickets()])


def ticket(ticket_id: str) -> TicketDetail:
    with store.LOCK:
        t = _ticket(ticket_id)
        return TicketDetail(id=t.id, status=t.status, customer=services.SIM.find_customer(t.email),
                            classification=t.classification, messages=t.messages, receipts=t.receipts,
                            verdicts=t.verdicts, rejected_drafts=t.rejected_drafts,
                            pending_action=t.pending_action, events=events.for_ticket(t.id))


def report() -> OlyaReport:
    evs = events.all_events()
    try:
        if impl("AGENT_IMPL") == "real":
            from agent.olya.report import report as olya_report

            return olya_report(evs)
        from agent.olya.kpis import compute

        return compute(evs)
    except ImportError:  # Olya not built yet
        return load_fixture(OlyaReport)


def reset() -> DemoReset:
    with store.LOCK:
        sim = services.reset()
        store.clear()
        events.clear()
        mirror.wipe()
    seed_demo()
    return DemoReset(ok=True, customers=sim.customer_count())


def seed_demo() -> None:
    """SEED_DEMO=1: add a week of synthetic past tickets (api/seed.py), so the console has history."""
    if seed.enabled():
        with store.LOCK:
            seed.seed(now())


# --- billing webhooks: the background loop ------------------------------------------------------------


async def webhook_loop(app: FastAPI) -> None:
    """Every 0.5 s: settle due billing actions and POST each event to /webhooks/billing, like real billing."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://billing.local", timeout=120) as client:
        while True:
            await asyncio.sleep(WEBHOOK_TICK_S)
            with services.LOCK:
                due = services.SIM.deliver_due(now())
            for event in due:
                try:
                    await client.post("/webhooks/billing", json=event.model_dump(mode="json"))
                except Exception:
                    log.exception("webhook %s not delivered", event.event_id)


# --- helpers ----------------------------------------------------------------------------------------------


def _ticket(ticket_id: str) -> store.Ticket:
    t = store.get(ticket_id)
    if t is None:
        raise HTTPException(404, f"no ticket {ticket_id}")
    return t


def _summary(t: store.Ticket) -> TicketSummary:
    first = next((m.text for m in t.messages if m.role == "customer"), "")
    customer = services.SIM.find_customer(t.email)
    return TicketSummary(id=t.id, customer_email=t.email, customer_name=customer.name if customer else None,
                         subject=first if len(first) <= 80 else first[:77] + "...", status=t.status,
                         chargeback_threat=bool(t.classification and t.classification.chargeback_threat),
                         last_decision=t.verdicts[-1].decision if t.verdicts else None, updated_at=t.updated_at)


def _as_submitted(billed: ActionReceipt) -> ActionReceipt:
    """Billing settled an action before the agent's run returned its receipt: start from the submitted state."""
    return billed.model_copy(update={"status": "pending", "evidence": [], "failure_reason": None,
                                     "updated_at": billed.created_at})


def _apply_webhook(receipt: ActionReceipt, event: BillingWebhook, readback: ActionReceipt,
                   seen: set[str]) -> tuple[ActionReceipt, Verdict]:
    try:
        from agent.zavuch.receipts import apply_webhook
    except ImportError:  # Zavuch's hook 2 not built yet: the same rule, minimal
        return _basic_apply_webhook(receipt, event, readback)
    return apply_webhook(receipt, event, readback, seen)


def _basic_apply_webhook(receipt: ActionReceipt, event: BillingWebhook,
                         readback: ActionReceipt) -> tuple[ActionReceipt, Verdict]:
    def verdict(decision, rule, reason):
        return Verdict(hook="after_action", decision=decision, rule=rule, reason=reason, receipt_id=receipt.id,
                       at=event.created_at)

    failed = event.type == "refund.failed"
    if readback.status != ("failed" if failed else "confirmed"):
        return receipt, verdict("BLOCK", "readback_mismatch", "Webhook and billing disagree; stays pending.")
    new = receipt.model_copy(update={"status": readback.status, "updated_at": event.created_at,
                                     "evidence": [*receipt.evidence, event.event_id],
                                     "failure_reason": readback.failure_reason})
    if failed:
        return new, verdict("ESCALATE", "webhook_failed", "Billing says the refund failed; a human decides.")
    return new, verdict("PASS", "webhook_confirmed", "Billing confirmed it (webhook + read-back).")
