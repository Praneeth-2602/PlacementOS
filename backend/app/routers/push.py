from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import PushSubscription, User
from app.schemas.common import ApiResponse
from app.schemas.notifications import PushSubscriptionRequest

router = APIRouter(prefix="/notifications", tags=["push"])
settings = get_settings()


@router.get("/push/vapid-public-key", response_model=ApiResponse[dict])
def vapid_public_key():
    """Public VAPID key for the PWA service worker to subscribe to push (Phase 9)."""
    return ApiResponse(data={"public_key": settings.vapid_public_key or None})


@router.post("/subscribe", response_model=ApiResponse[dict])
def subscribe(
    body: PushSubscriptionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user.id, PushSubscription.token == body.token)
        .first()
    )
    if not row:
        row = PushSubscription(user_id=user.id, token=body.token, platform=body.platform)
        db.add(row)
        db.commit()
    return ApiResponse(data={"subscribed": True})


@router.delete("/subscribe", response_model=ApiResponse[dict])
def unsubscribe(
    body: PushSubscriptionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user.id, PushSubscription.token == body.token)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return ApiResponse(data={"subscribed": False})
