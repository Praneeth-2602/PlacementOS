"""XP, badges and leaderboard helpers (Phase 7).

Extends the existing Streak / WeeklyGoal mechanics rather than replacing them.
XP is stored on ``Profile.xp``; badges are a catalog (``Badge``) plus per-user
awards (``UserBadge``).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import (
    Badge,
    LessonProgress,
    LessonStatus,
    Profile,
    Streak,
    Submission,
    SubmissionVerdict,
    UserBadge,
)

XP_REWARDS = {
    "lesson_completed": 20,
    "problem_solved": 50,
    "daily_activity": 5,
}

# Badge catalog seeded idempotently in scripts/seed.py.
BADGE_CATALOG = [
    {"code": "first_solve", "name": "First Solve", "description": "Solved your first problem", "icon": "trophy", "xp_reward": 25},
    {"code": "streak_7", "name": "7-Day Streak", "description": "Kept a 7-day activity streak", "icon": "fire", "xp_reward": 50},
    {"code": "roadmap_complete", "name": "Roadmap Finisher", "description": "Completed a full roadmap", "icon": "map", "xp_reward": 100},
    {"code": "problem_10", "name": "Grinder", "description": "Solved 10 problems", "icon": "dumbbell", "xp_reward": 75},
]


def level_for_xp(xp: int) -> int:
    """Simple level curve: 100 XP per level."""
    return xp // 100 + 1


def award_xp(db: Session, user_id: str, amount: int) -> int:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id, settings={}, xp=0)
        db.add(profile)
        db.flush()
    profile.xp = (profile.xp or 0) + amount
    db.commit()
    return profile.xp


def _award_badge(db: Session, user_id: str, code: str) -> bool:
    badge = db.query(Badge).filter(Badge.code == code).first()
    if not badge:
        return False
    exists = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == user_id, UserBadge.badge_id == badge.id)
        .first()
    )
    if exists:
        return False
    db.add(UserBadge(user_id=user_id, badge_id=badge.id))
    if badge.xp_reward:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if profile:
            profile.xp = (profile.xp or 0) + badge.xp_reward
    db.commit()
    return True


def check_badges(db: Session, user_id: str) -> list[str]:
    """Evaluate milestone badges; returns newly awarded badge codes."""
    awarded: list[str] = []

    solved = (
        db.query(Submission)
        .filter(Submission.user_id == user_id, Submission.verdict == SubmissionVerdict.ACCEPTED)
        .count()
    )
    if solved >= 1 and _award_badge(db, user_id, "first_solve"):
        awarded.append("first_solve")
    if solved >= 10 and _award_badge(db, user_id, "problem_10"):
        awarded.append("problem_10")

    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if streak and streak.current_streak >= 7 and _award_badge(db, user_id, "streak_7"):
        awarded.append("streak_7")

    completed_lessons = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user_id, LessonProgress.status == LessonStatus.COMPLETED)
        .count()
    )
    if completed_lessons >= 5 and _award_badge(db, user_id, "roadmap_complete"):
        awarded.append("roadmap_complete")

    return awarded
