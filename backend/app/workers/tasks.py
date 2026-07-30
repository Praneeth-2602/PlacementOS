from datetime import UTC, datetime, timedelta

from app.database import SessionLocal
from app.models import NotificationType, Opportunity
from app.services.github import run_github_sync
from app.services.leetcode import run_leetcode_sync
from app.services.notifications import create_notification
from app.services.readiness.engine import ReadinessEngine


async def leetcode_sync(ctx, user_id: str, username: str) -> None:
    db = SessionLocal()
    try:
        await run_leetcode_sync(db, user_id, username)
    finally:
        db.close()


async def github_sync(ctx, user_id: str) -> None:
    db = SessionLocal()
    try:
        await run_github_sync(db, user_id)
    finally:
        db.close()


async def score_recalc(ctx, user_id: str) -> None:
    db = SessionLocal()
    try:
        ReadinessEngine(db).recalculate(user_id)
    finally:
        db.close()


async def judge_run(ctx, submission_id: str) -> None:
    from app.services.judge import process_submission

    db = SessionLocal()
    try:
        await process_submission(db, submission_id)
    finally:
        db.close()


async def deadline_reminder(ctx) -> None:
    db = SessionLocal()
    try:
        tomorrow = datetime.now(UTC).date() + timedelta(days=1)
        rows = (
            db.query(Opportunity)
            .filter(
                Opportunity.deadline.is_not(None),
                Opportunity.deadline == tomorrow,
            )
            .all()
        )
        for row in rows:
            create_notification(
                db,
                user_id=row.user_id,
                title="Deadline reminder",
                message=f"{row.company} - {row.role} deadline is in 24 hours",
                notification_type=NotificationType.DEADLINE_REMINDER,
                extra_data={"opportunity_id": row.id, "deadline": row.deadline.isoformat()},
            )
    finally:
        db.close()
