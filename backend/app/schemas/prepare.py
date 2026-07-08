from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import QuestionDifficulty, QuestionType


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: QuestionType
    question: str
    answer: str | None = None
    company: str | None = None
    difficulty: QuestionDifficulty
    topic: str | None = None
    tags: list | None = None


class QuestionCreateRequest(BaseModel):
    type: QuestionType = QuestionType.TECHNICAL
    question: str
    answer: str | None = None
    company: str | None = None
    difficulty: QuestionDifficulty = QuestionDifficulty.MEDIUM
    topic: str | None = None
    tags: list | None = None


class QuestionUpdateRequest(BaseModel):
    question: str | None = None
    answer: str | None = None
    company: str | None = None
    difficulty: QuestionDifficulty | None = None
    topic: str | None = None
    tags: list | None = None
    is_active: bool | None = None


class StarTemplateRequest(BaseModel):
    title: str
    prompt: str
    situation: str | None = None
    task: str | None = None
    action: str | None = None
    result: str | None = None


class StarTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    prompt: str
    situation: str | None = None
    task: str | None = None
    action: str | None = None
    result: str | None = None
    is_curated: bool


class SessionCreateRequest(BaseModel):
    session_type: str
    duration_minutes: int = Field(ge=0)
    questions_answered: int = Field(ge=0)
    self_score: float = Field(ge=0, le=10)
    notes: dict | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_type: str
    duration_minutes: int
    questions_answered: int
    self_score: float | None = None
    notes: dict | None = None
    created_at: datetime | None = None
