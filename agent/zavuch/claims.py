"""Zavuch hook 3, before the reply. The LLM only finds claims in the draft; this code judges them.

Rules (see tests/zavuch/test_before_reply.py):
  canceled, refunded -> receipt confirmed; refund_submitted -> receipt exists and not failed;
  timing -> promised_days >= REFUND_ARRIVAL_DAYS; other -> always ok.
Decision: failed receipt -> ESCALATE; missing/unconfirmed -> FIX claim_without_receipt;
bad timing -> FIX false_promise; else PASS.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from agent import llm
from agent.zavuch import policy
from contracts.agent import Claim, Verdict
from contracts.tools import ActionName, ActionReceipt

# Zavuch's own prompt. It sees only the draft text, never Yurko's reasoning, receipts or facts.
CLAIMS_SYSTEM = """\
You are Zavuch, an independent checker in a subscription app's support team. You read ONE draft reply
a support agent wants to send to a customer and list every statement of fact in it about actions and
money. You do not decide whether the statements are true; you only find them.

Kinds:
- canceled: the subscription is presented as already cancelled, stopped or not renewing
  ("is cancelled", "I've cancelled", "you won't be charged again").
- refunded: the refund is presented as done: issued, processed, completed, returned, "the money is back".
- refund_submitted: a refund is submitted, requested, initiated or being processed, i.e. not done yet.
- timing: any statement about WHEN the money arrives. promised_days is the number of days stated
  ("up to 15 business days" -> 15, "within a week" -> 7, "today" -> 0). If the money is said to be
  there already, "now" or "immediately", promised_days is null.
- other: another factual claim about the account (access until a date, the amount charged).
Skip apologies, instructions, advice and questions.

text: the exact words from the draft, kept short. One sentence can hold several claims
("cancelled and refunded, the money is already on your card" -> canceled, refunded, timing).
Return an empty list when the draft states no such facts.
"""


class _Found(BaseModel):
    """Strict-mode schema: every field required, so Claim's judge-only fields stay out of it."""

    text: str
    kind: Literal["canceled", "refunded", "refund_submitted", "timing", "other"]
    promised_days: int | None


class _Claims(BaseModel):
    claims: list[_Found]


def extract_claims(draft: str) -> list[Claim]:
    """Statements of fact in the draft (OPENAI_FAST_MODEL); receipt_id, ok, problem are left to judge_claims."""
    found = llm.parse(llm.FAST, CLAIMS_SYSTEM, f"DRAFT:\n{draft}", _Claims)
    return [Claim(text=f.text, kind=f.kind, promised_days=f.promised_days) for f in found.claims]


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
