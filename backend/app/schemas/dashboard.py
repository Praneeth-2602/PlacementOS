from pydantic import BaseModel

from app.schemas.github import GitHubActivityResponse
from app.schemas.leetcode import LeetCodeStatsResponse
from app.schemas.readiness import ReadinessResponse


class ProgressSnapshot(BaseModel):
    leetcode_total_solved: int = 0
    github_repo_count: int = 0
    github_total_stars: int = 0


class WeeklyGoalProgress(BaseModel):
    dsa_target: int = 0
    dsa_completed: int = 0
    cs_target: int = 0
    cs_completed: int = 0


class DashboardResponse(BaseModel):
    readiness: ReadinessResponse
    progress: ProgressSnapshot
    weekly_goal: WeeklyGoalProgress | None = None
    streak_current: int = 0
    upcoming_deadlines: list = []
    leetcode_stats: LeetCodeStatsResponse | None = None
    github_activity: GitHubActivityResponse | None = None
