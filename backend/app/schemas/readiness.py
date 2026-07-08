from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReadinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dsa_score: float
    cs_score: float
    projects_score: float
    interview_score: float
    resume_score: float
    opportunities_score: float
    overall_score: float
    updated_at: datetime | None = None
