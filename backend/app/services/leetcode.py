import json
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from app.models import LeetCodeIntegration, LeetCodeStats, LeetCodeTopicProgress
from app.services.cache import CacheService
from app.services.notifications import create_notification
from app.services.readiness.engine import ReadinessEngine
from app.services.sync_status import SyncStatusService
from app.services.streak import record_activity
from app.services.weekly_goals import increment_goal
from app.models.entities import NotificationType

LEETCODE_GRAPHQL = "https://leetcode.com/graphql"
SYNC_COOLDOWN_MINUTES = 15

USER_PROFILE_QUERY = """
query userPublicProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats: submitStatsGlobal {
      acSubmissionNum { difficulty count submissions }
    }
    profile { ranking reputation }
    userCalendar { submissionCalendar }
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
}
"""


def _parse_submission_calendar(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        return {str(k): int(v) for k, v in json.loads(raw).items()}
    except (json.JSONDecodeError, TypeError):
        return {}


def _count_streak(calendar: dict) -> int:
    if not calendar:
        return 0
    today = datetime.now(UTC).date()
    streak = 0
    current = today
    while True:
        key = current.strftime("%Y-%m-%d")
        if calendar.get(key, 0) > 0:
            streak += 1
            current -= timedelta(days=1)
        else:
            break
    return streak


async def fetch_leetcode_profile(username: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            LEETCODE_GRAPHQL,
            json={"query": USER_PROFILE_QUERY, "variables": {"username": username}},
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("errors"):
            raise ValueError(payload["errors"][0].get("message", "LeetCode API error"))
        matched = payload.get("data", {}).get("matchedUser")
        if not matched:
            raise ValueError(f"LeetCode user '{username}' not found")
        return matched


def can_sync(integration: LeetCodeIntegration | None) -> bool:
    if not integration or not integration.last_synced_at:
        return True
    elapsed = datetime.now(UTC) - integration.last_synced_at.replace(tzinfo=UTC)
    return elapsed >= timedelta(minutes=SYNC_COOLDOWN_MINUTES)


async def run_leetcode_sync(db: Session, user_id: str, username: str) -> None:
    SyncStatusService.set("leetcode", user_id, "syncing", 10)
    integration = db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == user_id).first()
    if not integration:
        integration = LeetCodeIntegration(user_id=user_id)
        db.add(integration)
        db.flush()

    try:
        SyncStatusService.set("leetcode", user_id, "syncing", 30)
        profile = await fetch_leetcode_profile(username)

        counts = {item["difficulty"].lower(): item["count"] for item in profile["submitStats"]["acSubmissionNum"]}
        calendar_raw = profile.get("userCalendar", {}).get("submissionCalendar")
        calendar = _parse_submission_calendar(calendar_raw)
        streak = _count_streak(calendar)

        stats = integration.stats
        if not stats:
            stats = LeetCodeStats(integration_id=integration.id)
            db.add(stats)

        stats.total_solved = counts.get("all", 0)
        stats.easy_solved = counts.get("easy", 0)
        stats.medium_solved = counts.get("medium", 0)
        stats.hard_solved = counts.get("hard", 0)
        stats.ranking = profile.get("profile", {}).get("ranking")
        stats.current_streak = streak
        stats.submission_calendar = calendar

        SyncStatusService.set("leetcode", user_id, "syncing", 70)

        tag_groups = profile.get("tagProblemCounts", {})
        existing = {
            row.topic: row
            for row in db.query(LeetCodeTopicProgress)
            .filter(LeetCodeTopicProgress.integration_id == integration.id)
            .all()
        }
        for group in ("fundamental", "intermediate", "advanced"):
            for item in tag_groups.get(group, []) or []:
                topic = item["tagName"]
                solved = item.get("problemsSolved", 0)
                row = existing.get(topic)
                if row:
                    row.solved_count = solved
                else:
                    db.add(
                        LeetCodeTopicProgress(
                            integration_id=integration.id,
                            topic=topic,
                            solved_count=solved,
                        )
                    )

        integration.username = username
        integration.is_connected = True
        integration.last_synced_at = datetime.now(UTC)
        integration.sync_status = "complete"
        db.commit()

        CacheService.delete(CacheService.leetcode_stats_key(user_id))
        CacheService.delete(CacheService.dashboard_key(user_id))
        ReadinessEngine(db).recalculate(user_id)
        record_activity(db, user_id)
        increment_goal(db, user_id, dsa_delta=1)
        create_notification(
            db,
            user_id=user_id,
            title="LeetCode sync complete",
            message=f"Successfully synced LeetCode profile @{username}",
            notification_type=NotificationType.SYNC_COMPLETE,
        )

        SyncStatusService.set("leetcode", user_id, "complete", 100)
    except Exception:
        integration.sync_status = "failed"
        db.commit()
        SyncStatusService.set("leetcode", user_id, "failed", 0)
        raise
