from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import GitHubIntegration, GitHubRepo, InterviewSession, LeetCodeIntegration, Opportunity, Streak, User, WeeklyGoal
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardResponse, ProgressSnapshot, WeeklyGoalProgress
from app.schemas.github import GitHubActivityResponse
from app.schemas.leetcode import LeetCodeStatsResponse
from app.schemas.readiness import ReadinessResponse
from app.services.cache import CacheService
from app.services.dashboard_today import build_today_plan
from app.services.readiness.engine import ReadinessEngine

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _build_dashboard(db: Session, user: User) -> DashboardResponse:
    readiness = ReadinessEngine(db).get_or_recalculate(user.id)

    lc = (
        db.query(LeetCodeIntegration)
        .options(joinedload(LeetCodeIntegration.stats))
        .filter(LeetCodeIntegration.user_id == user.id)
        .first()
    )
    gh = (
        db.query(GitHubIntegration)
        .options(joinedload(GitHubIntegration.repos), joinedload(GitHubIntegration.activity_stats))
        .filter(GitHubIntegration.user_id == user.id)
        .first()
    )
    streak = db.query(Streak).filter(Streak.user_id == user.id).first()
    weekly = (
        db.query(WeeklyGoal)
        .filter(WeeklyGoal.user_id == user.id)
        .order_by(WeeklyGoal.week_start.desc())
        .first()
    )

    repos: list[GitHubRepo] = gh.repos if gh else []
    progress = ProgressSnapshot(
        leetcode_total_solved=lc.stats.total_solved if lc and lc.stats else 0,
        github_repo_count=len(repos),
        github_total_stars=sum(r.stars for r in repos),
    )

    weekly_goal = None
    if weekly:
        weekly_goal = WeeklyGoalProgress(
            dsa_target=weekly.dsa_target,
            dsa_completed=weekly.dsa_completed,
            cs_target=weekly.cs_target,
            cs_completed=weekly.cs_completed,
        )

    leetcode_stats = None
    if lc and lc.stats:
        leetcode_stats = LeetCodeStatsResponse.model_validate(lc.stats)

    github_activity = None
    if gh and gh.activity_stats:
        github_activity = GitHubActivityResponse(
            total_contributions=gh.activity_stats.total_contributions,
            contribution_calendar=gh.activity_stats.contribution_calendar,
            updated_at=gh.activity_stats.updated_at,
        )

    return DashboardResponse(
        readiness=ReadinessResponse.model_validate(readiness),
        progress=progress,
        weekly_goal=weekly_goal,
        streak_current=streak.current_streak if streak else 0,
        upcoming_deadlines=[],
        leetcode_stats=leetcode_stats,
        github_activity=github_activity,
    )


@router.get("", response_model=ApiResponse[DashboardResponse])
def get_dashboard(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cache_key = CacheService.dashboard_key(user.id)
    cached = CacheService.get(cache_key)
    if cached:
        return ApiResponse(data=DashboardResponse(**cached))

    data = _build_dashboard(db, user)
    CacheService.set(cache_key, data.model_dump(), CacheService.TTL_DASHBOARD)
    return ApiResponse(data=data)


@router.get("/today", response_model=ApiResponse[dict])
def get_today_plan(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=build_today_plan(db, user.id))


@router.get("/recent-activity", response_model=ApiResponse[list[dict]])
def recent_activity(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    events = []
    latest_sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(5)
        .all()
    )
    latest_opps = (
        db.query(Opportunity)
        .filter(Opportunity.user_id == user.id)
        .order_by(Opportunity.updated_at.desc())
        .limit(5)
        .all()
    )
    for row in latest_sessions:
        events.append({"type": "MOCK_SESSION", "at": row.created_at, "title": f"Logged {row.session_type} session"})
    for row in latest_opps:
        events.append({"type": "OPPORTUNITY", "at": row.updated_at, "title": f"{row.company} moved to {row.status.value}"})
    events.sort(key=lambda x: x["at"], reverse=True)
    return ApiResponse(data=events[:10])
