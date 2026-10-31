"""Tickets, in memory (STORE=memory). backend-3b swaps this for Supabase (tickets, actions)."""

import threading
from datetime import datetime

from pydantic import BaseModel

from api import mirror
from contracts.agent import (
    AgentOutput,
    Classification,
    Message,
    ProposedAction,
    TicketStatus,
    Verdict,
)
from contracts.tools import ActionReceipt, ReceiptStatus

LOCK = threading.RLock()  # every read-modify-write of a ticket holds it; agent runs never do
FIRST_TICKET = 1042


class Ticket(BaseModel):
    id: str  # "T-1042" in memory; a uuid with STORE=supabase (tickets.id)
    email: str
    customer_ref: str | None = None  # billing customer id; never the email (tickets.customer_ref)
    approved_by: str | None = None  # the human who allowed the pending action
    status: TicketStatus = "open"
    classification: Classification | None = None
    messages: list[Message] = []
    receipts: list[ActionReceipt] = []
    verdicts: list[Verdict] = []
    rejected_drafts: list[str] = []
    pending_action: ProposedAction | None = None
    created_at: datetime
    updated_at: datetime
    busy: bool = False  # an agent run is in progress
    stale: bool = False  # a receipt changed during that run: run receipt_update after it


_tickets: dict[str, Ticket] = {}
_seen_events: set[str] = set()


def new(email: str, now: datetime, customer_ref: str | None = None) -> Ticket:
    tid = mirror.new_id() if mirror.enabled() else f"T-{FIRST_TICKET + len(_tickets)}"
    t = Ticket(id=tid, email=email, customer_ref=customer_ref, created_at=now, updated_at=now)
    _tickets[t.id] = t
    return t


def get(ticket_id: str) -> Ticket | None:
    return _tickets.get(ticket_id)


def all_tickets() -> list[Ticket]:
    return sorted(_tickets.values(), key=lambda t: t.updated_at, reverse=True)


def add_message(t: Ticket, msg: Message) -> Message:
    msg = msg.model_copy(update={"id": f"m{len(t.messages) + 1}"})
    t.messages.append(msg)
    t.updated_at = max(t.updated_at, msg.at)
    return msg


def receipt_by_key(t: Ticket, idempotency_key: str) -> ActionReceipt | None:
    return next((r for r in t.receipts if r.idempotency_key == idempotency_key), None)


def merge_receipt(t: Ticket, r: ActionReceipt) -> ReceiptStatus | None:
    """Insert or update by id; a settled status is never overwritten by a stale "pending".
    Returns the status before the merge (None = new receipt)."""
    for i, old in enumerate(t.receipts):
        if old.id == r.id:
            if not (r.status == "pending" and old.status != "pending"):
                t.receipts[i] = r
            return old.status
    t.receipts.append(r)
    return None


def apply_output(t: Ticket, out: AgentOutput, now: datetime) -> None:
    """Everything but receipts (merged one by one by the caller, which logs each change)."""
    if out.classification:
        t.classification = out.classification
    t.verdicts.extend(out.verdicts)
    t.rejected_drafts.extend(out.rejected_drafts)
    t.pending_action = out.pending_action
    t.status = out.status
    t.updated_at = now


def seen(event_id: str) -> bool:
    return event_id in _seen_events


def seen_events() -> set[str]:
    return set(_seen_events)


def mark_seen(event_id: str) -> None:
    _seen_events.add(event_id)


def clear() -> None:
    _tickets.clear()
    _seen_events.clear()
