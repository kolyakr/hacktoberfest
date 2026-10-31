"""HTTP API (contracts/api.py). Routes only call api/flow.py.

    make dev    # :8000; AGENT_IMPL=fake|real, TOOLS_IMPL=fake|real, STORE=memory|supabase
"""

import asyncio
import contextlib
from collections.abc import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import flow
from contracts.agent import AgentOutput, HumanDecision, OlyaReport
from contracts.api import ChatRequest, DemoReset, TicketDetail, TicketList, WebhookAck
from contracts.tools import BillingWebhook

load_dotenv()  # .env: OPENAI_*, AGENT_IMPL, TOOLS_IMPL, STORE, SUPABASE_*; real env wins


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    flow.seed_demo()
    loop = asyncio.create_task(flow.webhook_loop(app))
    yield
    loop.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await loop


app = FastAPI(title="Yurko · Zavuch · Olya", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/chat", response_model=AgentOutput)
def chat(req: ChatRequest) -> AgentOutput:
    return flow.chat(req)


@app.get("/api/tickets", response_model=TicketList)
def tickets() -> TicketList:
    return flow.tickets()


@app.get("/api/tickets/{ticket_id}", response_model=TicketDetail)
def ticket(ticket_id: str) -> TicketDetail:
    return flow.ticket(ticket_id)


@app.post("/api/tickets/{ticket_id}/decision", response_model=AgentOutput)
def decision(ticket_id: str, body: HumanDecision) -> AgentOutput:
    return flow.decide(ticket_id, body)


@app.post("/webhooks/billing", response_model=WebhookAck)
def billing_webhook(event: BillingWebhook) -> WebhookAck:
    return flow.webhook(event)


@app.get("/api/report", response_model=OlyaReport)
def report() -> OlyaReport:
    return flow.report()


@app.post("/api/demo/reset", response_model=DemoReset)
def demo_reset() -> DemoReset:
    return flow.reset()
