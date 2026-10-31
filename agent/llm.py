"""Every OpenAI call in the product goes through here: Yurko, Zavuch and Olya.

Two models, both from env, never hard-coded:
    OPENAI_FAST_MODEL  loops, routing, checks: classify, plan actions, extract claims
    OPENAI_MODEL       final text: the customer reply, Olya's insight

`parse()` uses Structured Outputs and returns a validated Pydantic model. Strict mode means: keep
schemas small, no `dict` fields (Classification, Plan, Claims are fine). `text()` returns prose.
The SDK retries 429 / 5xx / connection errors with backoff; we add one retry for a refusal, an empty
answer or JSON that does not validate, then raise LLMError so the caller can escalate.

Smoke test (live): `uv run python -m agent.llm` prints a Classification for Marta.
"""

import logging
import os
import re
from functools import cache

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, ValidationError

load_dotenv()  # OPENAI_API_KEY and the model names from .env; existing env vars win

FAST = os.getenv("OPENAI_FAST_MODEL", "gpt-5-mini")
BIG = os.getenv("OPENAI_MODEL", "gpt-5")

log = logging.getLogger(__name__)


class LLMError(RuntimeError):
    """No usable output after a retry: refusal, empty answer or invalid JSON."""


@cache
def client() -> OpenAI:
    """One client per process, built on first use so importing this module needs no API key."""
    return OpenAI(max_retries=3, timeout=60)


def _messages(system: str, user: str) -> list[dict[str, str]]:
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _opts(model: str) -> dict:
    """gpt-5 / o-series take a reasoning effort: "minimal" for the fast model's routing and checks, "low"
    for the final text (OPENAI_REASONING_EFFORT overrides both). Other models, and the non-reasoning
    *-chat-* ones, reject the parameter, so they get nothing."""
    if "chat" in model or not re.match(r"^(gpt-5|o\d)", model):
        return {}
    default = "minimal" if model == FAST and model.startswith("gpt-5") else "low"  # o-series has no "minimal"
    return {"reasoning": {"effort": os.getenv("OPENAI_REASONING_EFFORT") or default}}


def _where(e: ValueError) -> str:
    """Error type and field paths only: the values would echo customer text into the logs."""
    if isinstance(e, ValidationError):
        return f"ValidationError at {sorted({'.'.join(map(str, err['loc'])) for err in e.errors()})}"
    return type(e).__name__


def parse[M: BaseModel](model: str, system: str, user: str, schema: type[M]) -> M:
    """Ask `model` for one `schema` instance. Validated by Pydantic; one retry, then LLMError."""
    last: Exception | None = None
    for attempt in (1, 2):
        try:
            r = client().responses.parse(model=model, input=_messages(system, user), text_format=schema,
                                         **_opts(model))
        except ValueError as e:  # pydantic ValidationError and JSONDecodeError are both ValueErrors
            last = e
            log.warning("%s: %s attempt %d did not validate: %s", schema.__name__, model, attempt, _where(e))
            continue
        if r.output_parsed is not None:
            return r.output_parsed
        last = LLMError(f"{model} returned no {schema.__name__} (refusal or empty output)")
        log.warning("%s: %s attempt %d: %s", schema.__name__, model, attempt, last)
    raise LLMError(f"{schema.__name__} from {model} failed twice") from last


generate_json = parse  # the name PLAN.md uses


def text(model: str, system: str, user: str) -> str:
    """Ask `model` for prose: the customer reply and Olya's insight (BIG). One retry on empty."""
    for attempt in (1, 2):
        out = client().responses.create(model=model, input=_messages(system, user),
                                        **_opts(model)).output_text.strip()
        if out:
            return out
        log.warning("%s attempt %d returned empty text", model, attempt)
    raise LLMError(f"{model} returned empty text twice")


if __name__ == "__main__":
    from agent.prompts import CLASSIFY_SYSTEM
    from contracts._kit import load_fixture
    from contracts.agent import Classification
    from contracts.api import ChatRequest

    logging.basicConfig(level=logging.INFO)
    marta = load_fixture(ChatRequest, "marta")
    cls = parse(FAST, CLASSIFY_SYSTEM, f"Customer ({marta.email}) writes:\n\n{marta.text}", Classification)
    print(f"model: {FAST}")
    print(cls.model_dump_json(indent=2))
