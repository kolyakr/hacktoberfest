"""HTTP API: the shapes web/ sees. Pattern:

    class AskRequest(BaseModel):
        question: str

    class AskResponse(BaseModel):
        answer: str
        model: str                      # OpenAI model id, shown in the UI

    ENDPOINTS = [Endpoint("POST", "/api/ask", request=AskRequest, response=AskResponse)]

Each response model needs fixtures/<Model>.ok.json. Then run `make contracts`.

`make mock-api` serves the `ok` fixture; add `?mock=<case>` to get fixtures/<Model>.<case>.json,
e.g. GET /api/tickets/T-1043?mock=john or POST /api/chat?mock=alex_block.
"""

from datetime import datetime

from pydantic import BaseModel

from contracts._kit import Endpoint
from contracts.agent import (
    AgentOutput,
    Classification,
    Decision,
    Event,
    HumanDecision,
    Message,
    OlyaReport,
    ProposedAction,
    TicketStatus,
    Verdict,
)
from contracts.tools import ActionReceipt, BillingWebhook, Customer


class ChatRequest(BaseModel):
    ticket_id: str | None = None  # None = start a new ticket
    email: str  # the customer's email, typed in the chat widget
    text: str


class TicketSummary(BaseModel):
    id: str
    customer_email: str
    customer_name: str | None = None
    subject: str  # first customer message, shortened
    status: TicketStatus
    chargeback_threat: bool = False
    last_decision: Decision | None = None  # Zavuch's latest verdict, for a badge
    updated_at: datetime


class TicketList(BaseModel):
    tickets: list[TicketSummary]


class TicketDetail(BaseModel):
    """Everything the support console shows for one ticket."""

    id: str
    status: TicketStatus
    customer: Customer | None = None
    classification: Classification | None = None
    messages: list[Message]
    receipts: list[ActionReceipt]
    verdicts: list[Verdict]
    rejected_drafts: list[str] = []
    pending_action: ProposedAction | None = None
    events: list[Event] = []


class WebhookAck(BaseModel):
    ok: bool
    duplicate: bool = False
    receipt: ActionReceipt | None = None


class DemoReset(BaseModel):
    ok: bool
    customers: int  # demo customers reloaded into billing


ENDPOINTS = [
    Endpoint("POST", "/api/chat", request=ChatRequest, response=AgentOutput,
             summary="Customer sends a message; Yurko answers (Zavuch checked)"),
    Endpoint("GET", "/api/tickets", response=TicketList, summary="Support console: all tickets"),
    Endpoint("GET", "/api/tickets/{ticket_id}", response=TicketDetail,
             summary="Support console: one ticket with receipts and verdicts"),
    Endpoint("POST", "/api/tickets/{ticket_id}/decision", request=HumanDecision, response=AgentOutput,
             summary="Human approves or refuses the pending action"),
    Endpoint("POST", "/webhooks/billing", request=BillingWebhook, response=WebhookAck,
             summary="Billing confirms or fails an action"),
    Endpoint("GET", "/api/report", response=OlyaReport, summary="Olya's KPI dashboard"),
    Endpoint("POST", "/api/demo/reset", response=DemoReset, summary="Reload demo customers, clear tickets"),
]
