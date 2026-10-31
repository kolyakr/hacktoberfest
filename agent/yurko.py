"""Yurko: understands the customer (classify), proposes actions (plan_actions), writes the reply (draft_reply).

Yurko never executes anything himself: the conductor in agent/__init__.py runs the tools, and only after
Zavuch's before_action says PASS. Every model call goes through agent/llm.py.
"""

from agent import llm, prompts
from contracts.agent import Classification, Message

ROLE_LABEL = {"customer": "Customer", "yurko": "Support (Yurko)", "human": "Support (human)", "system": "System"}


def transcript(messages: list[Message]) -> str:
    """The conversation as the model sees it, oldest first. Only what was written, no metadata."""
    return "\n\n".join(f"{ROLE_LABEL[m.role]}: {m.text}" for m in messages)


def classify(messages: list[Message]) -> Classification:
    """What the customer wants and how risky it is (OPENAI_FAST_MODEL)."""
    return llm.parse(llm.FAST, prompts.CLASSIFY_SYSTEM, transcript(messages), Classification)
