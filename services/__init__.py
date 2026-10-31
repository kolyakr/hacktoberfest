"""Tools Yurko calls, by name (keys of contracts.tools.TOOLS), all on one shared BillingSim.

Callers use contracts._kit.registry() (TOOLS_IMPL=real), never this module directly; api/ uses SIM and reset().
"""

import threading
from collections.abc import Callable
from datetime import UTC, datetime

from pydantic import BaseModel

from contracts.tools import (
    ActionReceipt,
    CancelSubscriptionArgs,
    FindCustomerArgs,
    FindCustomerResult,
    GetActionStatusArgs,
    HandToHumanArgs,
    HandToHumanResult,
    RefundPaymentArgs,
)
from services.billing import BillingSim


def _now() -> datetime:
    return datetime.now(UTC)


SIM = BillingSim.from_fixtures(_now(), clock=_now)
HUMAN_QUEUE: list[str] = []  # ticket ids waiting for a human, oldest first
LOCK = threading.RLock()  # tool calls (agent threads) and the webhook loop share SIM


def reset() -> BillingSim:
    """Fresh demo customers, no receipts, empty human queue."""
    global SIM
    with LOCK:
        SIM = BillingSim.from_fixtures(_now(), clock=_now)
        HUMAN_QUEUE.clear()
    return SIM


def find_customer(args: FindCustomerArgs) -> FindCustomerResult:
    with LOCK:
        c = SIM.find_customer(args.email)
    return FindCustomerResult(found=c is not None, customer=c)


def cancel_subscription(args: CancelSubscriptionArgs) -> ActionReceipt:
    with LOCK:
        return SIM.cancel(args.ticket_id, args.subscription_id)


def refund_payment(args: RefundPaymentArgs) -> ActionReceipt:
    with LOCK:
        return SIM.refund(args.ticket_id, args.payment_id, args.amount)


def get_action_status(args: GetActionStatusArgs) -> ActionReceipt:
    with LOCK:
        return SIM.status(args.receipt_id)


def hand_to_human(args: HandToHumanArgs) -> HandToHumanResult:
    if args.ticket_id not in HUMAN_QUEUE:
        HUMAN_QUEUE.append(args.ticket_id)
    return HandToHumanResult(queued=True, position=HUMAN_QUEUE.index(args.ticket_id) + 1)


REGISTRY: dict[str, Callable[[BaseModel], BaseModel]] = {
    "find_customer": find_customer,
    "cancel_subscription": cancel_subscription,
    "refund_payment": refund_payment,
    "get_action_status": get_action_status,
    "hand_to_human": hand_to_human,
}
