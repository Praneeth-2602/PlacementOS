from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import MentorRequestStatus


class MentorProfileRequest(BaseModel):
    headline: str | None = None
    expertise: list[str] | None = None
    seniority: str | None = None
    availability: list[str] | None = None
    is_active: bool = True


class MentorProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    headline: str | None = None
    expertise: list | None = None
    seniority: str | None = None
    availability: list | None = None
    is_active: bool


class MentorRequestCreate(BaseModel):
    message: str | None = None
    slot: str | None = None


class MentorRequestRespond(BaseModel):
    accept: bool
    slot: str | None = None


class MentorRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    mentor_id: str
    mentee_id: str
    status: MentorRequestStatus
    message: str | None = None
    slot: str | None = None
    created_at: datetime | None = None
