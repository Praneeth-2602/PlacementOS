from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import TopicStatus


class CSProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subject: str
    topic: str
    status: TopicStatus
    confidence: int
    updated_at: datetime | None = None


class CSProgressUpdateRequest(BaseModel):
    status: TopicStatus
    confidence: int = Field(ge=0, le=100, default=0)


class CSSummaryItem(BaseModel):
    subject: str
    total_topics: int
    completed_topics: int
    completion_percent: float


class AptitudeProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    section: str
    topic: str
    attempted: int
    correct: int
    updated_at: datetime | None = None


class AptitudeProgressUpdateRequest(BaseModel):
    attempted: int = Field(ge=0)
    correct: int = Field(ge=0)
