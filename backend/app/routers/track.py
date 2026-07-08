from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import CSProgress, LeetCodeIntegration, Opportunity, ScoreHistory, User, WeeklyGoal
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/track", tags=["track"])


@router.get("/dsa-heatmap", response_model=ApiResponse[list[dict]])
def dsa_heatmap(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == user.id).first()
    calendar = integration.stats.submission_calendar if integration and integration.stats else {}
    payload = [{"date": k, "count": v} for k, v in sorted((calendar or {}).items())]
    return ApiResponse(data=payload)


@router.get("/score-history", response_model=ApiResponse[list[dict]])
def score_history(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = (
        db.query(ScoreHistory)
        .filter(ScoreHistory.user_id == user.id)
        .order_by(ScoreHistory.created_at.asc())
        .all()
    )
    return ApiResponse(
        data=[
            {
                "timestamp": row.created_at,
                "overall": row.overall_score,
                "dsa": row.dsa_score,
                "cs": row.cs_score,
                "projects": row.projects_score,
                "interview": row.interview_score,
                "resume": row.resume_score,
                "opportunities": row.opportunities_score,
            }
            for row in rows
        ]
    )


@router.get("/topic-breakdown", response_model=ApiResponse[dict])
def topic_breakdown(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(CSProgress).filter(CSProgress.user_id == user.id).all()
    summary: dict[str, dict[str, int]] = defaultdict(lambda: {"completed": 0, "in_progress": 0, "total": 0})
    for row in rows:
        s = summary[row.subject]
        s["total"] += 1
        if row.status.value == "COMPLETED":
            s["completed"] += 1
        elif row.status.value == "IN_PROGRESS":
            s["in_progress"] += 1
    return ApiResponse(data=summary)


@router.get("/weekly-report", response_model=ApiResponse[dict])
def weekly_report(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    today = datetime.now(UTC).date()
    this_week_start = today - timedelta(days=today.weekday())
    prev_week_start = this_week_start - timedelta(days=7)
    goals = (
        db.query(WeeklyGoal)
        .filter(WeeklyGoal.user_id == user.id, WeeklyGoal.week_start.in_([this_week_start, prev_week_start]))
        .all()
    )
    goal_map = {goal.week_start: goal for goal in goals}
    opp_this_week = (
        db.query(Opportunity)
        .filter(Opportunity.user_id == user.id, Opportunity.updated_at >= datetime.combine(this_week_start, datetime.min.time()))
        .count()
    )
    this_goal = goal_map.get(this_week_start)
    prev_goal = goal_map.get(prev_week_start)
    return ApiResponse(
        data={
            "week_start": this_week_start,
            "dsa_completed": this_goal.dsa_completed if this_goal else 0,
            "cs_completed": this_goal.cs_completed if this_goal else 0,
            "dsa_delta": (this_goal.dsa_completed if this_goal else 0) - (prev_goal.dsa_completed if prev_goal else 0),
            "cs_delta": (this_goal.cs_completed if this_goal else 0) - (prev_goal.cs_completed if prev_goal else 0),
            "opportunities_updated": opp_this_week,
        }
    )
