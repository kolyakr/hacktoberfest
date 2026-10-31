"""PawChamp refund and cancellation policy, quoted from its public pages (Membership Policy, Terms §6.4-6.7).

Rules in rules.py cite these clauses; the console and Yurko's drafts quote the texts.
Numbers live in contracts/agent.py so every side uses the same ones.
"""

from contracts.agent import EU_WITHDRAWAL_DAYS, REFUND_ARRIVAL_DAYS

__all__ = ["EU_WITHDRAWAL_DAYS", "REFUND_ARRIVAL_DAYS", "CLAUSES", "STORE_NAMES"]

MEMBERSHIP_POLICY = "Membership Policy"
CANCELLATION = "Terms §6.4"
EU_WITHDRAWAL = "Terms §6.5.1"
REFUND_TERMS = "Terms §6.6"
STORE_REFUNDS = "Terms §6.6 (app stores)"
TRIAL = "Terms §6.7"

CLAUSES: dict[str, str] = {
    MEMBERSHIP_POLICY: 'Website purchases are "generally non-refundable"; refunds are decided '
    '"case-by-case, at our discretion".',
    CANCELLATION: "Canceling the subscription also cancels its add-ons.",
    EU_WITHDRAWAL: f'EU consumers may withdraw "within {EU_WITHDRAWAL_DAYS} days of your purchase".',
    REFUND_TERMS: f'Refunds: "please allow up to {REFUND_ARRIVAL_DAYS} business days"; customers are '
    '"not entitled to multiple refunds for the same transaction".',
    STORE_REFUNDS: 'App Store / Google Play purchases are "subject to Apple and Google\'s refund policies"; '
    "the customer asks Apple or Google directly.",
    TRIAL: "A trial converts to a paid subscription automatically; reminders are not guaranteed.",
}

STORE_NAMES = {"app_store": "Apple (App Store)", "google_play": "Google (Google Play)"}
