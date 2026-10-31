"""Yurko: understands the customer (classify), proposes actions (plan_actions), writes the reply (draft_reply).

Yurko never executes anything himself: the conductor in agent/__init__.py runs the tools, and only after
Zavuch's before_action says PASS. Every model call goes through agent/llm.py.
"""

import os

from pydantic import BaseModel

from agent import llm, prompts
from contracts.agent import Classification, Message, ProposedAction
from contracts.tools import Customer

ROLE_LABEL = {"customer": "Customer", "yurko": "Support (Yurko)", "human": "Support (human)", "system": "System"}


class Plan(BaseModel):
    """What the planner returns: a small strict schema around the contract's ProposedAction."""

    actions: list[ProposedAction]


def transcript(messages: list[Message]) -> str:
    """The conversation as the model sees it, oldest first. Only what was written, no metadata."""
    return "\n\n".join(f"{ROLE_LABEL[m.role]}: {m.text}" for m in messages)


def classify(messages: list[Message]) -> Classification:
    """What the customer wants and how risky it is (OPENAI_FAST_MODEL)."""
    return llm.parse(llm.FAST, prompts.CLASSIFY_SYSTEM, transcript(messages), Classification)


def plan_actions(cls: Classification, customer: Customer, ticket_id: str) -> list[ProposedAction]:
    """Proposals only (OPENAI_FAST_MODEL). Zavuch judges each one; the conductor executes PASSed ones."""
    user = (
        f"Ticket {ticket_id}\n\nClassification:\n{cls.model_dump_json(indent=2)}\n\n"
        f"Customer record:\n{customer.model_dump_json(indent=2)}"
    )
    plan = llm.parse(llm.FAST, prompts.PLAN_SYSTEM, user, Plan)
    needed = {"cancel_subscription": "subscription_id", "refund_payment": "payment_id"}
    return [a for a in plan.actions if getattr(a, needed[a.tool]) and (a.tool != "refund_payment" or a.amount)]


def draft_reply(facts: str, feedback: str | None = None) -> str:
    """The customer-facing text (OPENAI_MODEL) from facts, not guesses. `feedback` is Zavuch's FIX reason.

    DEMO_OVERCLAIM=1 makes the *first* draft overclaim on purpose, so the demo shows Zavuch catching it.
    """
    user = f"FACTS:\n{facts}"
    if feedback:
        user += (
            f"\n\nYour previous draft was rejected by the checker: {feedback}\n"
            "Rewrite it so that every statement matches the FACTS."
        )
    elif os.getenv("DEMO_OVERCLAIM") == "1":
        return llm.text(llm.BIG, prompts.OVERCLAIM_SYSTEM, user)
    return llm.text(llm.BIG, prompts.DRAFT_SYSTEM, user)
