from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreateRequest(BaseModel):
    name: str
    description: str | None = None
    tech_stack: list[str] | None = None
    github_url: str | None = None
    deployment_url: str | None = None
    status: str = "IN_PROGRESS"


class ProjectUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    tech_stack: list[str] | None = None
    github_url: str | None = None
    deployment_url: str | None = None
    status: str | None = None


class LinkRepoRequest(BaseModel):
    repo_id: str


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    tech_stack: list | None = None
    github_url: str | None = None
    deployment_url: str | None = None
    github_repo_id: str | None = None
    status: str
    is_featured: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
