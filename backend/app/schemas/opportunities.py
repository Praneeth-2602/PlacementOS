from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import OpportunityStatus, OpportunityType


class OpportunityCreateRequest(BaseModel):
    company: str
    role: str
    type: OpportunityType = OpportunityType.PLACEMENT
    status: OpportunityStatus = OpportunityStatus.TRACKING
    ctc: str | None = None
    deadline: date | None = None
    oa_date: date | None = None
    jd_url: str | None = None
    notes: str | None = None


class OpportunityUpdateRequest(BaseModel):
    company: str | None = None
    role: str | None = None
    type: OpportunityType | None = None
    status: OpportunityStatus | None = None
    ctc: str | None = None
    deadline: date | None = None
    oa_date: date | None = None
    jd_url: str | None = None
    calendar_event_id: str | None = None
    notes: str | None = None


class OpportunityStatusUpdateRequest(BaseModel):
    status: OpportunityStatus


class OpportunityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company: str
    role: str
    type: OpportunityType
    status: OpportunityStatus
    ctc: str | None = None
    deadline: date | None = None
    oa_date: date | None = None
    jd_url: str | None = None
    calendar_event_id: str | None = None
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
