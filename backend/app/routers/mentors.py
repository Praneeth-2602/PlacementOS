from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import MentorProfile, MentorRequest, MentorRequestStatus, User
from app.schemas.common import ApiResponse
from app.schemas.mentors import (
    MentorProfileRequest,
    MentorProfileResponse,
    MentorRequestCreate,
    MentorRequestRespond,
    MentorRequestResponse,
)

router = APIRouter(prefix="/mentors", tags=["mentors"])


@router.get("", response_model=ApiResponse[list[MentorProfileResponse]])
def directory(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    expertise: str | None = Query(default=None),
):
    query = db.query(MentorProfile).filter(MentorProfile.is_active.is_(True))
    rows = query.all()
    if expertise:
        needle = expertise.lower()
        rows = [r for r in rows if r.expertise and any(needle in str(e).lower() for e in r.expertise)]
    return ApiResponse(data=[MentorProfileResponse.model_validate(r) for r in rows])


@router.post("/profile", response_model=ApiResponse[MentorProfileResponse])
def upsert_profile(
    body: MentorProfileRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
    if not profile:
        profile = MentorProfile(user_id=user.id)
        db.add(profile)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return ApiResponse(data=MentorProfileResponse.model_validate(profile))


@router.post("/{mentor_id}/request", response_model=ApiResponse[MentorRequestResponse])
def request_session(
    mentor_id: str,
    body: MentorRequestCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    mentor = db.query(MentorProfile).filter(MentorProfile.id == mentor_id, MentorProfile.is_active.is_(True)).first()
    if not mentor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found")
    if mentor.user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot request yourself")
    req = MentorRequest(mentor_id=mentor_id, mentee_id=user.id, message=body.message, slot=body.slot)
    db.add(req)
    db.commit()
    db.refresh(req)
    return ApiResponse(data=MentorRequestResponse.model_validate(req))


@router.get("/requests", response_model=ApiResponse[list[MentorRequestResponse]])
def my_requests(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Requests where the caller is the mentor (incoming) or the mentee (outgoing)."""
    mentor = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
    q = db.query(MentorRequest).filter(
        (MentorRequest.mentee_id == user.id)
        | (MentorRequest.mentor_id == (mentor.id if mentor else "__none__"))
    )
    rows = q.order_by(MentorRequest.created_at.desc()).all()
    return ApiResponse(data=[MentorRequestResponse.model_validate(r) for r in rows])


@router.post("/requests/{request_id}/respond", response_model=ApiResponse[MentorRequestResponse])
def respond_request(
    request_id: str,
    body: MentorRequestRespond,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    req = db.query(MentorRequest).filter(MentorRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    mentor = db.query(MentorProfile).filter(MentorProfile.id == req.mentor_id).first()
    if not mentor or mentor.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the mentor can respond")
    if req.status != MentorRequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already handled")
    req.status = MentorRequestStatus.ACCEPTED if body.accept else MentorRequestStatus.DECLINED
    if body.slot:
        req.slot = body.slot
    db.commit()
    db.refresh(req)
    return ApiResponse(data=MentorRequestResponse.model_validate(req))
