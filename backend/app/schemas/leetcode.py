from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeetCodeStatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    ranking: int | None = None
    current_streak: int
    contest_rating: float
    submission_calendar: dict | None = None
    updated_at: datetime | None = None


class LeetCodeTopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic: str
    solved_count: int
    needs_revision: bool


class LeetCodeSyncRequest(BaseModel):
    username: str


class SyncJobResponse(BaseModel):
    job_id: str


class SyncStatusResponse(BaseModel):
    status: str
    progress: int
