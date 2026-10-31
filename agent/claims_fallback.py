"""Fallback for Zavuch's `extract_claims` until agent/zavuch/claims.py has its own (zavuch-5).

The conductor prefers `agent.zavuch.claims.extract_claims` and only uses this when that name is missing.
The model sees nothing but the draft text: no facts, no receipts, no Yurko reasoning. That independence
is the point of Zavuch; judging the claims against receipts is pure code in agent/zavuch/claims.py.
"""

from typing import Literal

from pydantic import BaseModel

from agent import llm
from contracts.agent import Claim

CLAIMS_SYSTEM = """\
You are Zavuch, an independent checker in a subscription app's support team. You read ONE draft reply a
support agent wants to send to a customer and list every statement of fact in it about actions and money.
You do not judge whether the statements are true.

Kinds:
- canceled: the draft presents the subscription or membership as cancelled, stopped, or not renewing,
  as a done fact ("is cancelled", "I've cancelled", "you won't be charged again").
- refunded: the draft presents the refund as done: issued, processed, completed, returned, "the money is
  back", "you've been refunded".
- refund_submitted: the draft says a refund was submitted, requested, initiated, or is being processed,
  i.e. not done yet.
- timing: any statement about WHEN the money arrives. promised_days is the number of days stated
  ("up to 15 business days" -> 15, "within a week" -> 7, "today" -> 0). If the money is said to be
  already there, "now" or "immediately", promised_days is null.
- other: another factual claim about the account (access until a date, the amount charged). Skip
  instructions, apologies, advice and questions.

text: the exact words from the draft, kept short. One sentence can yield several claims
("cancelled and refunded, the money is already on your card" -> canceled, refunded, timing).
Return an empty list when the draft states no such facts.
"""


class Found(BaseModel):
    text: str
    kind: Literal["canceled", "refunded", "refund_submitted", "timing", "other"]
    promised_days: int | None


class Claims(BaseModel):
    claims: list[Found]


def extract_claims(draft: str) -> list[Claim]:
    """Statements of fact in the draft (OPENAI_FAST_MODEL). `ok`, `problem`, `receipt_id` are left for the judge."""
    found = llm.parse(llm.FAST, CLAIMS_SYSTEM, f"DRAFT:\n{draft}", Claims)
    return [Claim(text=f.text, kind=f.kind, promised_days=f.promised_days) for f in found.claims]
