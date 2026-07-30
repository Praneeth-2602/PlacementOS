from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import QuestionDifficulty, SubmissionVerdict


class ProblemSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    slug: str
    difficulty: QuestionDifficulty
    topic: str | None = None


class ProblemDetail(ProblemSummary):
    statement: str
    constraints: str | None = None
    sample_tests: list | None = None


class SubmitRequest(BaseModel):
    language: str = "python"
    code: str


class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    problem_id: str
    language: str
    verdict: SubmissionVerdict
    runtime_ms: int | None = None
    output: str | None = None
    passed_tests: int
    total_tests: int
    created_at: datetime | None = None
