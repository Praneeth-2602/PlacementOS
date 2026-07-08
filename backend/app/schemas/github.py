from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GitHubRepoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    github_repo_id: int
    name: str
    full_name: str
    description: str | None = None
    stars: int
    forks: int
    language: str | None = None
    topics: list | None = None
    pushed_at: datetime | None = None
    is_featured: bool


class GitHubActivityResponse(BaseModel):
    total_contributions: int
    contribution_calendar: dict | None = None
    updated_at: datetime | None = None
