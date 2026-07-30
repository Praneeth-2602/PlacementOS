from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    Application,
    Drive,
    DriveApplication,
    DriveStatus,
    Membership,
    MembershipStatus,
    Opportunity,
    OpportunityStatus,
    User,
)
from app.schemas.common import ApiResponse
from app.schemas.org import DriveResponse
from app.services import org as org_service
from app.services.readiness.engine import ReadinessEngine

router = APIRouter(prefix="/drives", tags=["drives"])


def _active_memberships(db: Session, user_id: str) -> list[Membership]:
    return (
        db.query(Membership)
        .filter(Membership.user_id == user_id, Membership.status == MembershipStatus.ACTIVE)
        .all()
    )


@router.get("", response_model=ApiResponse[list[DriveResponse]])
def eligible_drives(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Students see only their org's open drives, filtered by eligibility."""
    memberships = _active_memberships(db, user.id)
    result: list[DriveResponse] = []
    for m in memberships:
        drives = (
            db.query(Drive)
            .filter(Drive.org_id == m.org_id, Drive.status == DriveStatus.OPEN)
            .all()
        )
        for d in drives:
            if org_service.is_eligible(d, m):
                result.append(DriveResponse.model_validate(d))
    return ApiResponse(data=result)


@router.post("/{drive_id}/apply", response_model=ApiResponse[dict])
def apply_to_drive(
    drive_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    drive = db.query(Drive).filter(Drive.id == drive_id).first()
    if not drive or drive.status != DriveStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found or closed")

    membership = (
        db.query(Membership)
        .filter(
            Membership.org_id == drive.org_id,
            Membership.user_id == user.id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this drive's org")
    if not org_service.is_eligible(drive, membership):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not meet the eligibility criteria")

    existing = (
        db.query(DriveApplication)
        .filter(DriveApplication.drive_id == drive_id, DriveApplication.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already applied to this drive")

    # Reuse the existing Opportunity/Application semantics as the single source of truth.
    opportunity = None
    if drive.opportunity_id:
        opportunity = db.query(Opportunity).filter(Opportunity.id == drive.opportunity_id).first()
    if not opportunity:
        opportunity = Opportunity(
            user_id=user.id,
            company=drive.company_name,
            role=drive.role or "Campus Role",
            status=OpportunityStatus.APPLIED,
        )
        db.add(opportunity)
        db.flush()

    application = Application(user_id=user.id, opportunity_id=opportunity.id, status="SUBMITTED")
    db.add(application)
    db.flush()

    drive_app = DriveApplication(
        drive_id=drive_id, user_id=user.id, application_id=application.id, status="APPLIED"
    )
    db.add(drive_app)
    db.commit()
    db.refresh(drive_app)
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(
        data={"drive_application_id": drive_app.id, "application_id": application.id},
        message="Applied to drive",
    )
