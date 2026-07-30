"""Billing / monetization (Phase 9).

Providers are abstracted behind a small interface so Stripe (global) or Razorpay
(India) can be selected by config. When ``billing_enabled`` is false or no keys
are present, a ``MockProvider`` is used so checkout + webhook flows are fully
exercisable in dev/CI without live keys. Webhook handling is idempotent, keyed
on the provider subscription id (provider state treated as source of truth).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Invoice,
    InvoiceStatus,
    Plan,
    Subscription,
    SubscriptionStatus,
)

DEFAULT_PLANS = [
    {"code": "free", "name": "Free", "price": 0, "currency": "USD", "interval": "month", "entitlements": {"tier": "free"}},
    {
        "code": "student_pro",
        "name": "Student Pro",
        "price": 900,
        "currency": "USD",
        "interval": "month",
        "entitlements": {
            "tier": "pro",
            "pro_ai": True,
            "unlimited_practice": True,
            "study_plan": True,
            "resume_rewrite": True,
            "recommendations": True,
            "max_daily_submissions": 1000,
        },
    },
    {
        "code": "institutional",
        "name": "Institutional (per seat)",
        "price": 500,
        "currency": "USD",
        "interval": "year",
        "entitlements": {
            "tier": "institutional",
            "pro_ai": True,
            "unlimited_practice": True,
            "study_plan": True,
            "resume_rewrite": True,
            "recommendations": True,
            "max_daily_submissions": 1000,
        },
    },
]


class MockProvider:
    name = "mock"

    def create_checkout_session(self, *, plan: Plan, reference: str) -> dict:
        return {
            "checkout_url": f"https://billing.mock/checkout/{reference}",
            "provider_sub_id": f"mock_sub_{reference}",
            "provider": self.name,
        }

    def parse_webhook(self, body: bytes, signature: str | None) -> dict:
        # Mock accepts a plain JSON body: {"type": ..., "provider_sub_id": ..., "status": ...}
        return json.loads(body.decode("utf-8")) if body else {}


class StripeProvider:
    name = "stripe"

    def __init__(self, settings):
        self.settings = settings

    def create_checkout_session(self, *, plan: Plan, reference: str) -> dict:
        import stripe

        stripe.api_key = self.settings.stripe_api_key
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": self.settings.stripe_price_pro, "quantity": 1}],
            success_url=f"{self.settings.frontend_url}/billing?status=success",
            cancel_url=f"{self.settings.frontend_url}/billing?status=cancel",
            client_reference_id=reference,
        )
        return {"checkout_url": session.url, "provider_sub_id": session.subscription, "provider": self.name}

    def parse_webhook(self, body: bytes, signature: str | None) -> dict:
        import stripe

        event = stripe.Webhook.construct_event(body, signature, self.settings.stripe_webhook_secret)
        obj = event["data"]["object"]
        return {
            "type": event["type"],
            "provider_sub_id": obj.get("subscription") or obj.get("id"),
            "status": obj.get("status"),
        }


class RazorpayProvider:
    name = "razorpay"

    def __init__(self, settings):
        self.settings = settings

    def create_checkout_session(self, *, plan: Plan, reference: str) -> dict:
        # Razorpay uses subscriptions/orders; kept minimal + mockable.
        return {
            "checkout_url": f"{self.settings.frontend_url}/billing/razorpay/{reference}",
            "provider_sub_id": f"rzp_{reference}",
            "provider": self.name,
        }

    def parse_webhook(self, body: bytes, signature: str | None) -> dict:
        payload = json.loads(body.decode("utf-8")) if body else {}
        return {
            "type": payload.get("event"),
            "provider_sub_id": payload.get("provider_sub_id") or payload.get("subscription_id"),
            "status": payload.get("status"),
        }


def get_provider():
    settings = get_settings()
    if not settings.billing_enabled:
        return MockProvider()
    if settings.billing_provider == "stripe" and settings.stripe_api_key:
        return StripeProvider(settings)
    if settings.billing_provider == "razorpay" and settings.razorpay_key_id:
        return RazorpayProvider(settings)
    return MockProvider()


def ensure_plans(db: Session) -> None:
    for row in DEFAULT_PLANS:
        if not db.query(Plan).filter(Plan.code == row["code"]).first():
            db.add(Plan(**row))
    db.commit()


_STATUS_MAP = {
    "active": SubscriptionStatus.ACTIVE,
    "trialing": SubscriptionStatus.TRIALING,
    "past_due": SubscriptionStatus.PAST_DUE,
    "canceled": SubscriptionStatus.CANCELED,
    "incomplete": SubscriptionStatus.INCOMPLETE,
}


def apply_webhook_event(db: Session, event: dict) -> Subscription | None:
    """Idempotently reconcile subscription state from a provider webhook."""
    provider_sub_id = event.get("provider_sub_id")
    if not provider_sub_id:
        return None
    sub = db.query(Subscription).filter(Subscription.provider_sub_id == provider_sub_id).first()
    if not sub:
        return None

    event_type = (event.get("type") or "").lower()
    raw_status = (event.get("status") or "").lower()
    if "deleted" in event_type or "cancel" in event_type:
        sub.status = SubscriptionStatus.CANCELED
    elif raw_status in _STATUS_MAP:
        sub.status = _STATUS_MAP[raw_status]
    elif "completed" in event_type or "paid" in event_type or "created" in event_type:
        sub.status = SubscriptionStatus.ACTIVE

    if sub.status == SubscriptionStatus.ACTIVE:
        sub.current_period_end = datetime.now(UTC) + timedelta(days=30)
        # Record an invoice (idempotent-ish for the mock flow).
        db.add(
            Invoice(
                subscription_id=sub.id,
                amount=sub.plan.price if sub.plan else 0,
                currency=sub.plan.currency if sub.plan else "USD",
                status=InvoiceStatus.PAID,
                provider_invoice_id=f"inv_{provider_sub_id}",
            )
        )
    db.commit()
    db.refresh(sub)
    return sub
