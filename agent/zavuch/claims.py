"""Zavuch hook 3, before the reply. The LLM only finds claims in the draft; this code judges them.

Rules (see tests/zavuch/test_before_reply.py):
  canceled, refunded -> receipt confirmed; refund_submitted -> receipt exists and not failed;
  timing -> promised_days >= REFUND_ARRIVAL_DAYS; other -> always ok.
Decision: failed receipt -> ESCALATE; missing/unconfirmed -> FIX claim_without_receipt;
bad timing -> FIX false_promise; else PASS.
"""

from datetime import datetime

from agent.zavuch import policy
from contracts.agent import Claim, Verdict
from contracts.tools import ActionName, ActionReceipt

_ACTION_FOR: dict[str, ActionName] = {
    "canceled": "cancel_subscription",
    "refunded": "refund_payment",
    "refund_submitted": "refund_payment",
    "timing": "refund_payment",
}


def judge_claims(claims: list[Claim], receipts: list[ActionReceipt], now: datetime) -> Verdict:
    judged = [_judge(c, receipts) for c in claims]
    status = {r.id: r.status for r in receipts}
    bad = [c for c in judged if not c.ok]
    failed = [c for c in bad if c.kind != "timing" and status.get(c.receipt_id) == "failed"]
    no_receipt = [c for c in bad if c.kind != "timing" and c not in failed]
    if failed:
        decision, rule, worst = "ESCALATE", "claim_on_failed_receipt", failed[0]
    elif no_receipt:
        decision, rule, worst = "FIX", "claim_without_receipt", no_receipt[0]
    elif bad:
        decision, rule, worst = "FIX", "false_promise", bad[0]
    else:
        n = len(judged)
        reason = f"All {n} claims match the receipts." if n else "No claims of fact to check."
        return Verdict(
            hook="before_reply", decision="PASS", rule="ok", reason=reason, claims=judged, at=now
        )
    reason = f'"{worst.text}": {worst.problem}'
    return Verdict(
        hook="before_reply", decision=decision, rule=rule, reason=reason, claims=judged, at=now
    )


def _judge(claim: Claim, receipts: list[ActionReceipt]) -> Claim:
    r = _match(claim, receipts)
    rid = r.id if r else claim.receipt_id
    ok, problem = True, None
    if claim.kind == "timing":
        if claim.promised_days is None or claim.promised_days < policy.REFUND_ARRIVAL_DAYS:
            when = "already" if claim.promised_days is None else f"in {claim.promised_days} days"
            ok = False
            problem = f"promises the money {when}; policy allows up to {policy.REFUND_ARRIVAL_DAYS} business days"
    elif claim.kind in ("canceled", "refunded", "refund_submitted"):
        need = "not failed" if claim.kind == "refund_submitted" else "confirmed"
        if r is None:
            ok, problem = False, f"no {_ACTION_FOR[claim.kind]} receipt behind this claim"
        elif r.status == "failed":
            ok, problem = False, f"receipt failed ({r.failure_reason or 'no reason given'})"
        elif need == "confirmed" and r.status != "confirmed":
            ok, problem = False, f"receipt {r.id} is still {r.status}"
    return claim.model_copy(update={"receipt_id": rid, "ok": ok, "problem": problem})


def _match(claim: Claim, receipts: list[ActionReceipt]) -> ActionReceipt | None:
    if claim.receipt_id:
        return next((r for r in receipts if r.id == claim.receipt_id), None)
    action = _ACTION_FOR.get(claim.kind)
    found = [r for r in receipts if r.action == action]
    return found[-1] if found else None
