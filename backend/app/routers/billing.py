from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_entitlements
from app.models import Invoice, Plan, Subscription, SubscriptionStatus, User
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    EntitlementsResponse,
    InvoiceResponse,
    PlanResponse,
    SubscriptionResponse,
)
from app.schemas.common import ApiResponse
from app.services import billing

router = APIRouter(prefix="/billing", tags=["billing"])

_ACTIVE = (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING)


def _current_subscription(db: Session, user_id: str) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status.in_(_ACTIVE))
        .order_by(Subscription.updated_at.desc())
        .first()
    )


@router.get("/plans", response_model=ApiResponse[list[PlanResponse]])
def list_plans(db: Annotated[Session, Depends(get_db)]):
    billing.ensure_plans(db)
    rows = db.query(Plan).filter(Plan.is_active.is_(True)).all()
    return ApiResponse(data=[PlanResponse.model_validate(r) for r in rows])


@router.post("/checkout", response_model=ApiResponse[CheckoutResponse])
def checkout(
    body: CheckoutRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    billing.ensure_plans(db)
    plan = db.query(Plan).filter(Plan.code == body.plan_code, Plan.is_active.is_(True)).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    provider = billing.get_provider()
    sub = Subscription(
        user_id=None if body.org_id else user.id,
        org_id=body.org_id,
        plan_id=plan.id,
        status=SubscriptionStatus.INCOMPLETE,
        provider=provider.name,
        seats=max(1, body.seats),
    )
    db.add(sub)
    db.flush()
    session = provider.create_checkout_session(plan=plan, reference=sub.id)
    sub.provider_sub_id = session.get("provider_sub_id")
    db.commit()
    db.refresh(sub)
    return ApiResponse(
        data=CheckoutResponse(
            checkout_url=session["checkout_url"], subscription_id=sub.id, provider=provider.name
        )
    )


@router.post("/webhook")
async def webhook(request: Request, db: Annotated[Session, Depends(get_db)]):
    """Provider webhook (subscription lifecycle). Idempotent by provider_sub_id."""
    body = await request.body()
    signature = request.headers.get("stripe-signature") or request.headers.get("x-razorpay-signature")
    provider = billing.get_provider()
    try:
        event = provider.parse_webhook(body, signature)
    except Exception as exc:  # invalid signature / payload
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook") from exc
    sub = billing.apply_webhook_event(db, event)
    return ApiResponse(data={"handled": bool(sub), "status": sub.status.value if sub else None})


@router.get("/subscription", response_model=ApiResponse[EntitlementsResponse])
def current_subscription(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    entitlements: Annotated[dict, Depends(get_entitlements)],
):
    sub = _current_subscription(db, user.id)
    return ApiResponse(
        data=EntitlementsResponse(
            subscription=SubscriptionResponse.model_validate(sub) if sub else None,
            entitlements=entitlements,
        )
    )


@router.post("/subscription/cancel", response_model=ApiResponse[dict])
def cancel_subscription(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    sub = _current_subscription(db, user.id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription")
    sub.status = SubscriptionStatus.CANCELED
    db.commit()
    return ApiResponse(data={"canceled": True}, message="Subscription canceled")


@router.get("/invoices", response_model=ApiResponse[list[InvoiceResponse]])
def invoices(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    sub_ids = [s.id for s in db.query(Subscription).filter(Subscription.user_id == user.id).all()]
    rows = (
        db.query(Invoice).filter(Invoice.subscription_id.in_(sub_ids)).order_by(Invoice.issued_at.desc()).all()
        if sub_ids
        else []
    )
    return ApiResponse(data=[InvoiceResponse.model_validate(r) for r in rows])
