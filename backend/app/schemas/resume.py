from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeCreateRequest(BaseModel):
    version_name: str = "Untitled"
    target_role: str | None = None
    json_data: dict | None = None


class ResumeUpdateRequest(BaseModel):
    version_name: str | None = None
    target_role: str | None = None
    json_data: dict | None = None


class ResumeAnalyzeV2Request(BaseModel):
    job_description_text: str | None = None


class ResumeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_name: str
    is_default: bool
    target_role: str | None = None
    file_url: str | None = None
    json_data: dict | None = None
    ats_score: float | None = None
    ats_analysis: dict | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
