from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Opportunity, User
from app.schemas.common import ApiResponse
from app.schemas.opportunities import (
    OpportunityCreateRequest,
    OpportunityResponse,
    OpportunityStatusUpdateRequest,
    OpportunityUpdateRequest,
)
from app.services.opportunities import update_status
from app.services.readiness.engine import ReadinessEngine
from app.services.streak import record_activity

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.get("", response_model=ApiResponse[list[OpportunityResponse]])
def list_opportunities(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(default=None),
    type: str | None = Query(default=None),
):
    query = db.query(Opportunity).filter(Opportunity.user_id == user.id)
    if status:
        query = query.filter(Opportunity.status == status.upper())
    if type:
        query = query.filter(Opportunity.type == type.upper())
    rows = query.order_by(Opportunity.updated_at.desc()).all()
    return ApiResponse(data=[OpportunityResponse.model_validate(row) for row in rows])


@router.post("", response_model=ApiResponse[OpportunityResponse])
def create_opportunity(
    body: OpportunityCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = Opportunity(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data=OpportunityResponse.model_validate(row))


@router.put("/{opportunity_id}", response_model=ApiResponse[OpportunityResponse])
def update_opportunity(
    opportunity_id: str,
    body: OpportunityUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Opportunity).filter(Opportunity.id == opportunity_id, Opportunity.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=OpportunityResponse.model_validate(row))


@router.delete("/{opportunity_id}", response_model=ApiResponse[dict])
def delete_opportunity(
    opportunity_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Opportunity).filter(Opportunity.id == opportunity_id, Opportunity.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    db.delete(row)
    db.commit()
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data={"deleted": True})


@router.put("/{opportunity_id}/status", response_model=ApiResponse[OpportunityResponse])
def update_opportunity_status(
    opportunity_id: str,
    body: OpportunityStatusUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Opportunity).filter(Opportunity.id == opportunity_id, Opportunity.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    row = update_status(db, row, body.status)
    record_activity(db, user.id)
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data=OpportunityResponse.model_validate(row))


@router.get("/deadlines", response_model=ApiResponse[list[OpportunityResponse]])
def deadlines(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cutoff = datetime.now(UTC).date() + timedelta(days=30)
    rows = (
        db.query(Opportunity)
        .filter(
            Opportunity.user_id == user.id,
            Opportunity.deadline.is_not(None),
            Opportunity.deadline <= cutoff,
        )
        .order_by(Opportunity.deadline.asc())
        .all()
    )
    return ApiResponse(data=[OpportunityResponse.model_validate(row) for row in rows])


@router.get("/calendar", response_model=ApiResponse[list[dict]])
def calendar_view(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Opportunity).filter(Opportunity.user_id == user.id).all()
    payload = []
    for row in rows:
        if row.deadline:
            payload.append(
                {
                    "id": row.id,
                    "type": "DEADLINE",
                    "title": f"{row.company} - {row.role}",
                    "date": row.deadline,
                    "status": row.status,
                }
            )
        if row.oa_date:
            payload.append(
                {
                    "id": row.id,
                    "type": "OA",
                    "title": f"{row.company} OA",
                    "date": row.oa_date,
                    "status": row.status,
                }
            )
    return ApiResponse(data=payload)


@router.post("/{opportunity_id}/calendar-sync", response_model=ApiResponse[dict])
def sync_calendar_event(
    opportunity_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Opportunity).filter(Opportunity.id == opportunity_id, Opportunity.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    row.calendar_event_id = f"mock-{row.id}"
    db.commit()
    return ApiResponse(data={"calendar_event_id": row.calendar_event_id, "synced": True})


@router.delete("/{opportunity_id}/calendar-sync", response_model=ApiResponse[dict])
def unsync_calendar_event(
    opportunity_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Opportunity).filter(Opportunity.id == opportunity_id, Opportunity.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    row.calendar_event_id = None
    db.commit()
    return ApiResponse(data={"synced": False})
