"""STORE=supabase: copy tickets, actions and the event log into Supabase (tables in supabase/migrations/),
so the console gets them over Realtime. The API keeps answering from memory; rows are written by one
background thread, in order, so a slow or unreachable Supabase never slows down or breaks the demo.

Env: STORE=supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the service role writes; the browser only reads).
"""

import logging
import os
import queue
import threading
import uuid
from typing import Any

import httpx

from contracts.agent import ProposedAction, TicketStatus, Verdict
from contracts.tools import ActionReceipt, ReceiptStatus

log = logging.getLogger("api.mirror")

# tickets.status has no awaiting_human / waiting_billing (roles/backend.md, "Сховище: Supabase")
TICKET_STATUS: dict[TicketStatus, str] = {
    "open": "open", "awaiting_human": "proposed", "waiting_billing": "approved",
    "resolved": "resolved", "escalated": "escalated",
}
ACTION_STATUS: dict[ReceiptStatus, str] = {"pending": "executed", "confirmed": "confirmed", "failed": "failed"}

_queue: queue.Queue[tuple[str, str, Any, dict[str, str], str]] = queue.Queue()
_worker: threading.Thread | None = None
_action_ids: dict[str, str] = {}  # receipt id or proposal key -> actions.id (uuid)


def enabled() -> bool:
    return os.getenv("STORE", "memory").strip().lower() == "supabase"


def new_id() -> str:
    return str(uuid.uuid4())


# --- rows ---------------------------------------------------------------------------------------------


def ticket(t: Any) -> None:
    """t: api.store.Ticket. Upserts the tickets row."""
    if not enabled():
        return
    first = next((m.text for m in t.messages if m.role == "customer"), "")
    c = t.classification
    _upsert("tickets", {
        "id": t.id, "channel": "web", "customer_ref": t.customer_ref or "unknown",
        "subject": first[:80], "body": first, "intent": ",".join(c.intents) if c else None,
        "priority": 1 if c and c.chargeback_threat else 3, "status": TICKET_STATUS[t.status],
        "created_at": t.created_at.isoformat(), "updated_at": t.updated_at.isoformat(),
    })


def receipt(ticket_id: str, r: ActionReceipt, policy_ref: str | None, approved_by: str | None) -> None:
    if not enabled():
        return
    _upsert("actions", {
        "id": action_id(r.id), "ticket_id": ticket_id, "tool": r.action,
        "args": {"target_id": r.target_id, "amount": r.amount, "currency": r.currency, "receipt_id": r.id,
                 "idempotency_key": r.idempotency_key, "evidence": r.evidence,
                 "failure_reason": r.failure_reason},
        "policy_ref": policy_ref, "mode": "ask" if approved_by else "auto", "status": ACTION_STATUS[r.status],
        "external_ref": r.billing_ref, "approved_by": approved_by,
        "created_at": r.created_at.isoformat(), "executed_at": r.updated_at.isoformat(),
    })


def proposal(ticket_id: str, key: str, p: ProposedAction, v: Verdict, approved_by: str | None = None) -> None:
    """A proposal Zavuch blocked (never) or sent to a human (ask: proposed, then approved)."""
    if not enabled():
        return
    blocked = v.decision == "BLOCK"
    _upsert("actions", {
        "id": action_id(key), "ticket_id": ticket_id, "tool": p.tool,
        "args": p.model_dump(mode="json", exclude={"policy_clause"}), "policy_ref": p.policy_clause,
        "mode": "never" if blocked else "ask",
        "status": "blocked" if blocked else ("approved" if approved_by else "proposed"),
        "approved_by": approved_by, "created_at": v.at.isoformat(),
    })


def event(ticket_id: str, type: str, actor: str, detail: dict[str, Any], at: str,
          receipt_id: str | None = None) -> None:
    if not enabled():
        return
    _queue_put("POST", "audit_log", {
        "ticket_id": ticket_id, "action_id": _action_ids.get(receipt_id) if receipt_id else None,
        "actor": actor, "event": type, "detail": detail, "created_at": at,
    })


def wipe() -> None:
    """Demo reset: tickets cascade to actions and audit_log."""
    _action_ids.clear()
    if enabled():
        _queue_put("DELETE", "tickets", None, params={"id": "not.is.null"})


def action_id(key: str) -> str:
    return _action_ids.setdefault(key, new_id())


def flush(timeout_s: float = 10) -> None:
    """Wait until every queued write is sent (scripts and checks; the API never waits)."""
    done = threading.Event()
    threading.Thread(target=lambda: (_queue.join(), done.set()), daemon=True).start()
    done.wait(timeout_s)


# --- the writer thread ---------------------------------------------------------------------------------


def _upsert(table: str, row: dict[str, Any]) -> None:
    _queue_put("POST", table, row, params={"on_conflict": "id"}, prefer="resolution=merge-duplicates")


def _queue_put(method: str, table: str, body: Any, params: dict[str, str] | None = None,
               prefer: str = "return=minimal") -> None:
    global _worker
    if _worker is None or not _worker.is_alive():
        _worker = threading.Thread(target=_write_forever, name="supabase-mirror", daemon=True)
        _worker.start()
    _queue.put((method, table, body, params or {}, prefer))


def _write_forever() -> None:
    url, key = os.getenv("SUPABASE_URL", "").rstrip("/"), os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not (url and key):
        log.error("STORE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; nothing is mirrored")
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    with httpx.Client(base_url=f"{url}/rest/v1", headers=headers, timeout=10) as client:
        while True:
            method, table, body, params, prefer = _queue.get()
            try:
                if url and key:
                    res = client.request(method, f"/{table}", params=params, json=body, headers={"Prefer": prefer})
                    if res.status_code >= 300:
                        log.error("supabase %s %s: %s %s", method, table, res.status_code, res.text[:300])
            except httpx.HTTPError as e:
                log.error("supabase %s %s: %s", method, table, e)
            finally:
                _queue.task_done()
