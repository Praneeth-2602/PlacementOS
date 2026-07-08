from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import CSProgress, LeetCodeIntegration, LeetCodeTopicProgress, Opportunity


def build_today_plan(db: Session, user_id: str) -> dict:
    weak_topics = (
        db.query(LeetCodeTopicProgress.topic)
        .join(LeetCodeIntegration, LeetCodeIntegration.id == LeetCodeTopicProgress.integration_id)
        .filter(LeetCodeIntegration.user_id == user_id)
        .order_by(LeetCodeTopicProgress.solved_count.asc())
        .limit(3)
        .all()
    )
    cs_to_review = (
        db.query(CSProgress.subject, CSProgress.topic)
        .filter(CSProgress.user_id == user_id)
        .order_by(CSProgress.updated_at.asc())
        .limit(2)
        .all()
    )
    deadline_cutoff = datetime.now(UTC).date() + timedelta(days=7)
    upcoming = (
        db.query(Opportunity)
        .filter(
            Opportunity.user_id == user_id,
            Opportunity.deadline.is_not(None),
            Opportunity.deadline <= deadline_cutoff,
        )
        .order_by(Opportunity.deadline.asc())
        .first()
    )
    return {
        "leetcode_problems": [t.topic for t in weak_topics],
        "cs_topics": [{"subject": row.subject, "topic": row.topic} for row in cs_to_review],
        "deadline_cta": (
            {
                "opportunity_id": upcoming.id,
                "company": upcoming.company,
                "role": upcoming.role,
                "deadline": upcoming.deadline,
            }
            if upcoming
            else None
        ),
    }
