from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import InvoiceStatus, SubscriptionStatus


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    price: int
    currency: str
    interval: str
    entitlements: dict | None = None
    is_active: bool


class CheckoutRequest(BaseModel):
    plan_code: str
    org_id: str | None = None
    seats: int = 1


class CheckoutResponse(BaseModel):
    checkout_url: str
    subscription_id: str
    provider: str


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_id: str
    status: SubscriptionStatus
    provider: str
    seats: int
    current_period_end: datetime | None = None


class EntitlementsResponse(BaseModel):
    subscription: SubscriptionResponse | None = None
    entitlements: dict


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subscription_id: str
    amount: int
    currency: str
    status: InvoiceStatus
    provider_invoice_id: str | None = None
    issued_at: datetime | None = None
