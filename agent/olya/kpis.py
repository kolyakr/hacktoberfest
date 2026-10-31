"""Olya's numbers from the append-only event log. Pure code; definitions in tests/olya/test_kpis.py.

top_reason, recommendation and model stay empty here: report.py fills them with the LLM.
"""

from collections import defaultdict
from datetime import datetime

from contracts.agent import Event, OlyaReport

FALSE_DONE_RULES = {"claim_without_receipt", "claim_on_failed_receipt", "false_promise"}


def compute(events: list[Event]) -> OlyaReport:
    opened: dict[str, datetime] = {}
    first_reply: dict[str, datetime] = {}
    resolved: set[str] = set()
    handed: set[str] = set()
    caught = false_done = 0
    refunded: dict[str, float] = defaultdict(float)
    counted_receipts: set[str] = set()

    for e in sorted(events, key=lambda e: e.at):
        t, d = e.ticket_id, e.data
        if e.type == "ticket.opened":
            opened.setdefault(t, e.at)
        elif e.type == "reply.sent":
            first_reply.setdefault(t, e.at)
        elif e.type == "ticket.resolved":
            resolved.add(t)
        elif e.type == "handed_to_human":
            handed.add(t)
        elif e.type == "hook.verdict" and d.get("decision") in ("FIX", "BLOCK"):
            caught += 1
            false_done += d.get("rule") in FALSE_DONE_RULES
        elif (
            e.type == "receipt.updated"
            and d.get("action") == "refund_payment"
            and d.get("status") == "confirmed"
        ):
            rid = d.get("receipt_id")
            if rid and rid in counted_receipts:  # one receipt is counted once
                continue
            if rid:
                counted_receipts.add(str(rid))
            refunded[str(d.get("currency"))] += float(d.get("amount") or 0)

    total = len(opened)
    without_human = len((resolved & opened.keys()) - handed)
    waits = [(first_reply[t] - at).total_seconds() for t, at in opened.items() if t in first_reply]
    return OlyaReport(
        tickets_total=total,
        resolved_without_human=without_human,
        resolved_without_human_pct=round(100 * without_human / total, 1) if total else 0.0,
        avg_first_response_s=round(sum(waits) / len(waits), 1) if waits else 0.0,
        zavuch_caught=caught,
        false_done_caught=false_done,
        escalated=len(handed),
        refunded_by_currency={c: round(v, 2) for c, v in refunded.items()},
    )
