"""Tools: one Args + one Result model per services/ function. Pattern:

    class SearchDocsArgs(BaseModel):
        query: str = Field(description="What to look up")   # the LLM reads the descriptions

    class SearchDocsResult(BaseModel):
        hits: list[str]

    TOOLS = {"search_docs": (SearchDocsArgs, SearchDocsResult, "Search the docs; use for facts.")}

services/__init__.py exposes `REGISTRY = {name: fn(Args) -> Result}` with the same keys.
Callers use `registry()` from contracts._kit, never `import services`.
Each Result needs fixtures/<Result>.ok.json.

Billing data (Customer, Subscription, Payment) lives here too: the billing simulator in services/
owns it, and the demo customers are fixtures/Customer.<name>.json.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Platform = Literal["web", "app_store", "google_play"]
Region = Literal["EU", "US", "OTHER"]
ActionName = Literal["cancel_subscription", "refund_payment"]
ReceiptStatus = Literal["pending", "confirmed", "failed"]
WebhookType = Literal["subscription.canceled", "refund.succeeded", "refund.failed"]


# --- billing data -------------------------------------------------------------------------------


class Payment(BaseModel):
    id: str  # "pay_marta_1"
    amount: float
    currency: str  # "EUR", "USD"
    charged_at: datetime
    description: str  # "7-day trial", "Monthly membership"
    refunded_amount: float = 0.0


class Subscription(BaseModel):
    id: str  # "sub_marta"
    plan: str  # "monthly", "weekly"
    price: float
    currency: str
    status: Literal["trial", "active", "canceled"]
    platform: Platform  # where it was bought; only "web" can be changed by us
    started_at: datetime
    current_period_end: datetime


class Customer(BaseModel):
    id: str  # "cus_marta"
    email: str
    name: str
    country: str  # ISO 3166 alpha-2, "DE"
    region: Region  # EU customers have a 14-day withdrawal right (Terms §6.5.1)
    subscription: Subscription | None = None
    payments: list[Payment] = []


# --- receipts and webhooks: the proof that an action happened ---------------------------------------


class ActionReceipt(BaseModel):
    """One action sent to billing. Not done until status == "confirmed" (webhook + read-back)."""

    id: str  # "rcp_1042_refund"
    ticket_id: str
    action: ActionName
    target_id: str  # subscription id or payment id
    amount: float | None = None  # refunds only
    currency: str | None = None
    idempotency_key: str  # f"{ticket_id}:{action}:{target_id}": a retry never refunds twice
    status: ReceiptStatus
    billing_ref: str | None = None  # billing's own id, "re_1"
    created_at: datetime
    updated_at: datetime
    evidence: list[str] = []  # webhook event ids and read-back notes that moved the status
    failure_reason: str | None = None


class BillingWebhook(BaseModel):
    """What billing POSTs to /webhooks/billing after an action settles."""

    event_id: str  # unique; the same event may arrive twice
    type: WebhookType
    object_id: str  # "sub_marta" or the refund's billing_ref "re_1"
    idempotency_key: str  # ties the event to an ActionReceipt
    created_at: datetime


# --- tools Yurko can call ---------------------------------------------------------------------------


class FindCustomerArgs(BaseModel):
    email: str = Field(description="The email the customer bought the membership with")


class FindCustomerResult(BaseModel):
    found: bool
    customer: Customer | None = None


class CancelSubscriptionArgs(BaseModel):
    ticket_id: str = Field(description="The current ticket id, e.g. T-1042")
    subscription_id: str = Field(description="Subscription id from find_customer, e.g. sub_marta")


class RefundPaymentArgs(BaseModel):
    ticket_id: str = Field(description="The current ticket id, e.g. T-1042")
    payment_id: str = Field(description="Payment id from find_customer, e.g. pay_marta_1")
    amount: float = Field(description="Amount to refund; never more than the payment")
    policy_clause: str = Field(description="The policy clause that allows it, e.g. 'Terms §6.5.1'")


class GetActionStatusArgs(BaseModel):
    receipt_id: str = Field(description="Receipt id returned by cancel_subscription or refund_payment")


class HandToHumanArgs(BaseModel):
    ticket_id: str = Field(description="The current ticket id, e.g. T-1042")
    reason: str = Field(description="One sentence for the human agent: what is needed and why")


class HandToHumanResult(BaseModel):
    queued: bool
    position: int  # place in the human queue


TOOLS: dict[str, tuple[type[BaseModel], type[BaseModel], str]] = {
    "find_customer": (
        FindCustomerArgs,
        FindCustomerResult,
        "Find the customer by purchase email: country, where they bought, subscription, payments "
        "and refunds. Call this first.",
    ),
    "cancel_subscription": (
        CancelSubscriptionArgs,
        ActionReceipt,
        "Stop auto-renewal of a subscription bought on the website. Returns a receipt; it is not "
        "done until the receipt is confirmed.",
    ),
    "refund_payment": (
        RefundPaymentArgs,
        ActionReceipt,
        "Refund one website payment, citing the policy clause. Returns a pending receipt; the money "
        "is not back until the receipt is confirmed.",
    ),
    "get_action_status": (
        GetActionStatusArgs,
        ActionReceipt,
        "Read a receipt back from billing: pending, confirmed or failed.",
    ),
    "hand_to_human": (
        HandToHumanArgs,
        HandToHumanResult,
        "Pass the ticket to a human support agent, with the reason.",
    ),
}
