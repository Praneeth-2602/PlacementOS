from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Application, Opportunity, OpportunityStatus

VALID_TRANSITIONS: dict[OpportunityStatus, set[OpportunityStatus]] = {
    OpportunityStatus.TRACKING: {OpportunityStatus.APPLIED, OpportunityStatus.DECLINED},
    OpportunityStatus.APPLIED: {OpportunityStatus.OA_SCHEDULED, OpportunityStatus.REJECTED, OpportunityStatus.DECLINED},
    OpportunityStatus.OA_SCHEDULED: {
        OpportunityStatus.INTERVIEW_SCHEDULED,
        OpportunityStatus.REJECTED,
        OpportunityStatus.DECLINED,
    },
    OpportunityStatus.INTERVIEW_SCHEDULED: {
        OpportunityStatus.OFFERED,
        OpportunityStatus.REJECTED,
        OpportunityStatus.DECLINED,
    },
    OpportunityStatus.OFFERED: {OpportunityStatus.ACCEPTED, OpportunityStatus.DECLINED},
    OpportunityStatus.REJECTED: set(),
    OpportunityStatus.ACCEPTED: set(),
    OpportunityStatus.DECLINED: set(),
}


def ensure_valid_transition(current: OpportunityStatus, target: OpportunityStatus) -> None:
    if current == target:
        return
    if target not in VALID_TRANSITIONS[current]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {current.value} to {target.value}",
        )


def update_status(db: Session, opportunity: Opportunity, target: OpportunityStatus) -> Opportunity:
    ensure_valid_transition(opportunity.status, target)
    opportunity.status = target
    if target == OpportunityStatus.APPLIED:
        existing = (
            db.query(Application)
            .filter(Application.user_id == opportunity.user_id, Application.opportunity_id == opportunity.id)
            .first()
        )
        if not existing:
            db.add(
                Application(
                    user_id=opportunity.user_id,
                    opportunity_id=opportunity.id,
                    status="SUBMITTED",
                    applied_at=datetime.now(UTC),
                )
            )
    db.commit()
    db.refresh(opportunity)
    return opportunity
