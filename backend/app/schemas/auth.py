from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class IntegrationStatus(BaseModel):
    is_connected: bool = False
    username: str | None = None
    last_synced_at: datetime | None = None
    sync_status: str = "idle"


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    university: str | None = None
    graduation_year: int | None = None
    target_role: str | None = None
    bio: str | None = None
    settings: dict | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    name: str | None = None
    avatar_url: str | None = None
    role: str
    created_at: datetime
    profile: ProfileResponse | None = None
    leetcode: IntegrationStatus | None = None
    github: IntegrationStatus | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
