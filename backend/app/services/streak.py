from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Streak


def record_activity(db: Session, user_id: str, activity_date: date | None = None) -> Streak:
    today = activity_date or datetime.now(UTC).date()
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        streak = Streak(user_id=user_id, current_streak=1, longest_streak=1, last_activity_date=today)
        db.add(streak)
        db.commit()
        db.refresh(streak)
        return streak

    last = streak.last_activity_date
    if last == today:
        return streak

    if last == today - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1
    streak.last_activity_date = today
    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    db.commit()
    db.refresh(streak)
    return streak
