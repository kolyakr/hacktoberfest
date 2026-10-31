"""Zavuch hook 2, after an action. Pure code: a receipt is confirmed only when the webhook AND the read-back agree.

Order (see tests/zavuch/test_after_action.py): wrong receipt -> ValueError; duplicate event -> no change;
refund.failed + read-back failed -> failed, ESCALATE; read-back disagrees -> stays pending, BLOCK;
otherwise -> confirmed.
"""

from contracts.agent import Decision, Rule, Verdict
from contracts.tools import ActionReceipt, BillingWebhook


def apply_webhook(
    receipt: ActionReceipt,
    event: BillingWebhook,
    readback: ActionReceipt,
    seen_event_ids: set[str],
) -> tuple[ActionReceipt, Verdict]:
    if event.idempotency_key != receipt.idempotency_key:
        raise ValueError(
            f"event {event.event_id} is for {event.idempotency_key}, not receipt {receipt.id}"
        )

    def verdict(decision: Decision, rule: Rule, reason: str) -> Verdict:
        return Verdict(
            hook="after_action",
            decision=decision,
            rule=rule,
            reason=reason,
            receipt_id=receipt.id,
            at=event.created_at,
        )

    if event.event_id in seen_event_ids:
        return receipt, verdict(
            "PASS", "duplicate_event", f"Event {event.event_id} was already processed."
        )

    # A failed webhook must be backed by a failed read-back, a success by a confirmed one.
    expected = "failed" if event.type == "refund.failed" else "confirmed"
    if readback.status != expected:
        return receipt, verdict(
            "BLOCK",
            "readback_mismatch",
            f"Webhook {event.type} but billing reads {readback.status}; the receipt stays {receipt.status}.",
        )

    new = receipt.model_copy(
        update={
            "status": expected,
            "updated_at": event.created_at,
            "evidence": [*receipt.evidence, event.event_id],
            "failure_reason": readback.failure_reason,
        }
    )
    if expected == "failed":
        why = readback.failure_reason or "no reason given"
        return new, verdict(
            "ESCALATE",
            "webhook_failed",
            f"Billing says the refund failed ({why}); a human decides.",
        )
    return new, verdict(
        "PASS",
        "webhook_confirmed",
        f"Billing confirmed {receipt.action} on {receipt.target_id} (webhook + read-back).",
    )
