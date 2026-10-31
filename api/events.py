"""The event log Olya reads. Written here only: from every AgentOutput, receipt change and webhook.
Kept in memory; with STORE=supabase each event is also written to audit_log (api/mirror.py)."""

from datetime import datetime
from typing import Any

from api import mirror
from contracts.agent import AgentOutput, Event, EventType, TicketStatus, Verdict
from contracts.tools import ActionReceipt, ReceiptStatus

_log: list[Event] = []

ACTOR: dict[str, str] = {
    "classified": "ai:yurko", "action.submitted": "ai:yurko", "reply.sent": "ai:yurko",
    "handed_to_human": "ai:yurko", "promise.kept": "ai:yurko",
    "hook.verdict": "ai:zavuch", "security.flag": "ai:zavuch",
}


def append(ticket_id: str, type: EventType, at: datetime, *, actor: str | None = None,
           detail: dict[str, Any] | None = None, receipt_id: str | None = None,
           **data: str | float | int | bool | None) -> Event:
    """One log line. `detail` adds richer data for audit_log only (the full verdict, the reply text)."""
    e = Event(id=f"ev_{len(_log) + 1}", at=at, ticket_id=ticket_id, type=type, data=data)
    _log.append(e)
    mirror.event(ticket_id, type, actor or ACTOR.get(type, "system"), {**data, **(detail or {})},
                 at.isoformat(), receipt_id)
    return e


def all_events() -> list[Event]:
    return list(_log)


def for_ticket(ticket_id: str) -> list[Event]:
    return [e for e in _log if e.ticket_id == ticket_id]


def clear() -> None:
    _log.clear()


def verdict(ticket_id: str, v: Verdict, draft: str | None = None) -> None:
    detail = v.model_dump(mode="json")
    if draft:
        detail["draft"] = draft
    append(ticket_id, "hook.verdict", v.at, detail=detail, receipt_id=v.receipt_id,
           hook=v.hook, decision=v.decision, rule=v.rule)


def receipt(ticket_id: str, r: ActionReceipt, before: ReceiptStatus | None, at: datetime) -> None:
    money = {"amount": r.amount, "currency": r.currency} if r.action == "refund_payment" else {}
    if before is None:
        append(ticket_id, "action.submitted", at, receipt_id=r.id, action=r.action, target_id=r.target_id,
               **money)
    if r.status != "pending" and r.status != before:
        append(ticket_id, "receipt.updated", at, receipt_id=r.id, detail={"evidence": r.evidence},
               action=r.action, status=r.status, **money)


def output(out: AgentOutput, before: TicketStatus, at: datetime) -> None:
    """Classification, verdicts, reply and status changes of one agent run (receipts: see receipt())."""
    t = out.ticket_id
    if out.classification:
        c = out.classification
        append(t, "classified", at, detail={"true_goal": c.true_goal, "sentiment": c.sentiment},
               intents=",".join(c.intents), chargeback_threat=c.chargeback_threat)
    flagged = (out.classification and out.classification.injection_suspected) or any(
        v.rule == "injection" for v in out.verdicts)
    if flagged:
        append(t, "security.flag", at, reason="injection")
    drafts = iter(out.rejected_drafts)
    for v in out.verdicts:
        fixed = v.hook == "before_reply" and v.decision == "FIX"
        verdict(t, v, next(drafts, None) if fixed else None)
    if out.reply:
        append(t, "reply.sent", at, detail={"text": out.reply.text}, model=out.model)
    if out.status in ("awaiting_human", "escalated") and before not in ("awaiting_human", "escalated"):
        append(t, "handed_to_human", at)
    if out.status == "resolved" and before != "resolved":
        append(t, "ticket.resolved", at)
