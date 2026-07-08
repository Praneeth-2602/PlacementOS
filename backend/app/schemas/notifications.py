from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: NotificationType
    title: str
    message: str
    is_read: bool
    extra_data: dict | None = None
    created_at: datetime | None = None


class PushSubscriptionRequest(BaseModel):
    token: str
    platform: str | None = None
