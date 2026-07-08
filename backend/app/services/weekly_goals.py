from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import WeeklyGoal


def week_start_for(day: date) -> date:
    return day - timedelta(days=day.weekday())


def get_or_create_weekly_goal(db: Session, user_id: str, for_date: date | None = None) -> WeeklyGoal:
    anchor = for_date or datetime.now(UTC).date()
    week_start = week_start_for(anchor)
    goal = db.query(WeeklyGoal).filter(WeeklyGoal.user_id == user_id, WeeklyGoal.week_start == week_start).first()
    if goal:
        return goal
    goal = WeeklyGoal(user_id=user_id, week_start=week_start)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def increment_goal(
    db: Session,
    user_id: str,
    *,
    dsa_delta: int = 0,
    cs_delta: int = 0,
) -> WeeklyGoal:
    goal = get_or_create_weekly_goal(db, user_id)
    if dsa_delta:
        goal.dsa_completed = max(0, goal.dsa_completed + dsa_delta)
    if cs_delta:
        goal.cs_completed = max(0, goal.cs_completed + cs_delta)
    goal.is_achieved = goal.dsa_completed >= goal.dsa_target and goal.cs_completed >= goal.cs_target
    db.commit()
    db.refresh(goal)
    return goal
