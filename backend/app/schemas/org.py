from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import DriveRoundType, DriveStatus, MembershipStatus, OrgRole, OrgType


class OrgCreateRequest(BaseModel):
    name: str
    slug: str
    type: OrgType = OrgType.COLLEGE
    verified_domains: list[str] | None = None
    seat_limit: int = 100


class OrgResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    type: OrgType
    verified_domains: list | None = None
    seat_limit: int


class OrgDetailResponse(OrgResponse):
    seats_used: int = 0
    seats_available: int = 0


class MemberRow(BaseModel):
    email: str
    branch: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None


class InviteRequest(BaseModel):
    members: list[MemberRow] | None = None
    csv: str | None = None


class ImportResponse(BaseModel):
    invited: int
    skipped: int
    seats_used: int
    seat_limit: int
    errors: list[dict] = []


class MembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    user_id: str | None = None
    email: str
    org_role: OrgRole
    branch: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None
    status: MembershipStatus


class DriveCreateRequest(BaseModel):
    company_name: str
    role: str | None = None
    ctc: str | None = None
    eligibility: dict | None = None
    visit_date: date | None = None
    opportunity_id: str | None = None
    status: DriveStatus = DriveStatus.OPEN


class DriveRoundCreateRequest(BaseModel):
    name: str
    round_type: DriveRoundType = DriveRoundType.OTHER
    scheduled_at: datetime | None = None
    order: int = 0


class DriveRoundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    round_type: DriveRoundType
    scheduled_at: datetime | None = None
    order: int


class DriveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    company_name: str
    role: str | None = None
    ctc: str | None = None
    eligibility: dict | None = None
    visit_date: date | None = None
    status: DriveStatus
    opportunity_id: str | None = None
    rounds: list[DriveRoundResponse] = []
