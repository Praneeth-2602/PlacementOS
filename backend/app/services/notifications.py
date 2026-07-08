from sqlalchemy.orm import Session

from app.models import Notification, NotificationType


def create_notification(
    db: Session,
    *,
    user_id: str,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    extra_data: dict | None = None,
) -> Notification:
    row = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        extra_data=extra_data,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
