"""Olya's dashboard: numbers from kpis.compute (code), one insight on top of them (OPENAI_MODEL).

The LLM gets only aggregates and per-ticket intents, never customer text, and cannot change a number.
If it fails, the dashboard still shows the numbers with empty texts.
"""

import json
import logging
from collections import Counter

from pydantic import BaseModel

from agent import llm
from agent.olya.kpis import compute
from contracts.agent import Event, OlyaReport

log = logging.getLogger(__name__)

INSIGHT_SYSTEM = """\
You are Olya, the analyst of a subscription app's support team (a dog-training app). You get the support
KPIs for a period and what each ticket was about. Write two short sentences for the team lead:
- top_reason: the most common reason customers wrote in, with a count from the data ("2 of 4 tickets").
- recommendation: one concrete product or policy change that would prevent that reason, not a support
  script. Mention the policy clause if it helps: a trial converts to paid automatically and reminders
  are not guaranteed (Terms §6.7); refunds take up to 15 business days (Terms §6.6).
Use only the numbers given. Do not invent figures. Plain English, no markdown.
"""


class Insight(BaseModel):
    top_reason: str
    recommendation: str


def report(events: list[Event]) -> OlyaReport:
    r = compute(events)
    if not r.tickets_total:
        return r
    try:
        insight = llm.parse(llm.BIG, INSIGHT_SYSTEM, _facts(events, r), Insight)
    except llm.LLMError as e:
        log.warning("Olya insight unavailable: %s", e)
        return r
    return r.model_copy(update={**insight.model_dump(), "model": llm.BIG})


def _facts(events: list[Event], r: OlyaReport) -> str:
    tickets: dict[str, dict] = {}
    rules: Counter[str] = Counter()
    for e in events:
        if e.type == "classified":
            t = tickets.setdefault(e.ticket_id, {})
            t["intents"] = e.data.get("intents")
            t["chargeback_threat"] = e.data.get("chargeback_threat", False)
            if e.data.get("true_goal"):
                t["true_goal"] = e.data["true_goal"]
        elif e.type == "hook.verdict" and e.data.get("decision") != "PASS":
            rules[f"{e.data.get('decision')} {e.data.get('rule')}"] += 1
        elif e.type == "handed_to_human":
            tickets.setdefault(e.ticket_id, {})["handed_to_human"] = True
        elif e.type == "security.flag":
            tickets.setdefault(e.ticket_id, {})["security_flag"] = e.data.get("reason")
    kpis = r.model_dump(exclude={"top_reason", "recommendation", "model"})
    return json.dumps({"kpis": kpis, "zavuch_verdicts": dict(rules), "tickets": tickets}, indent=1)
