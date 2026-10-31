"""Tools Yurko calls: `services/__init__.py: REGISTRY = {name: fn(Args) -> Result}` with the keys of
contracts.tools.TOOLS, backed by one shared BillingSim. Skipped until services/ exists."""

import pytest

from contracts.tools import (
    TOOLS,
    CancelSubscriptionArgs,
    FindCustomerArgs,
    GetActionStatusArgs,
    HandToHumanArgs,
    RefundPaymentArgs,
)

services = pytest.importorskip("services")


def test_registry_matches_contract():
    assert set(services.REGISTRY) == set(TOOLS)


def test_find_customer():
    out = services.REGISTRY["find_customer"](FindCustomerArgs(email="marta.k@example.com"))
    assert out.found and out.customer.id == "cus_marta"
    assert services.REGISTRY["find_customer"](FindCustomerArgs(email="nobody@example.com")).found is False


def test_actions_return_receipts_that_read_back():
    cancel = services.REGISTRY["cancel_subscription"](
        CancelSubscriptionArgs(ticket_id="T-T1", subscription_id="sub_john"))
    refund = services.REGISTRY["refund_payment"](
        RefundPaymentArgs(ticket_id="T-T1", payment_id="pay_john_1", amount=38.99, policy_clause="test"))
    for r in (cancel, refund):
        assert r.status == "pending"
        back = services.REGISTRY["get_action_status"](GetActionStatusArgs(receipt_id=r.id))
        assert back.id == r.id


def test_hand_to_human():
    out = services.REGISTRY["hand_to_human"](HandToHumanArgs(ticket_id="T-T1", reason="test"))
    assert out.queued
