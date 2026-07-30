from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Badge, Profile, Streak, User, UserBadge
from app.schemas.common import ApiResponse
from app.services.gamification import level_for_xp

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/summary", response_model=ApiResponse[dict])
def summary(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    xp = profile.xp if profile else 0
    streak = db.query(Streak).filter(Streak.user_id == user.id).first()
    badges = (
        db.query(Badge)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .filter(UserBadge.user_id == user.id)
        .all()
    )
    return ApiResponse(
        data={
            "xp": xp,
            "level": level_for_xp(xp),
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
            "badges": [
                {"code": b.code, "name": b.name, "icon": b.icon, "description": b.description} for b in badges
            ],
        }
    )


@router.get("/leaderboard", response_model=ApiResponse[list[dict]])
def leaderboard(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=20, le=100),
):
    """Cohort-scoped leaderboard (by graduation year). Privacy-safe: opt-out via
    ``settings.leaderboard_opt_out`` and anonymised display names for others.
    Enforces a minimum cohort size to avoid leaking small groups.
    """
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    grad_year = profile.graduation_year if profile else None
    if not grad_year:
        return ApiResponse(data=[], message="Set your graduation year to see the cohort leaderboard")

    cohort = (
        db.query(Profile, User)
        .join(User, User.id == Profile.user_id)
        .filter(Profile.graduation_year == grad_year)
        .all()
    )
    MIN_COHORT = 3
    entries = []
    for p, u in cohort:
        settings = p.settings or {}
        if settings.get("leaderboard_opt_out") and u.id != user.id:
            continue
        entries.append((p, u))

    if len(entries) < MIN_COHORT:
        return ApiResponse(data=[], message="Cohort too small for a leaderboard yet")

    entries.sort(key=lambda t: (t[0].xp or 0), reverse=True)
    result = []
    for rank, (p, u) in enumerate(entries[:limit], start=1):
        is_me = u.id == user.id
        result.append(
            {
                "rank": rank,
                "name": (u.name or "You") if is_me else f"Peer #{rank}",
                "xp": p.xp or 0,
                "level": level_for_xp(p.xp or 0),
                "is_me": is_me,
            }
        )
    return ApiResponse(data=result)
