from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import AptitudeProgress, CSProgress, User
from app.schemas.common import ApiResponse
from app.schemas.learn import (
    AptitudeProgressResponse,
    AptitudeProgressUpdateRequest,
    CSProgressResponse,
    CSProgressUpdateRequest,
    CSSummaryItem,
)
from app.services.cache import CacheService
from app.services.readiness.engine import ReadinessEngine
from app.services.streak import record_activity
from app.services.weekly_goals import increment_goal

router = APIRouter(prefix="/learn", tags=["learn"])


@router.get("/cs/{subject}", response_model=ApiResponse[list[CSProgressResponse]])
def get_cs_subject(
    subject: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = (
        db.query(CSProgress)
        .filter(CSProgress.user_id == user.id, CSProgress.subject == subject.upper())
        .order_by(CSProgress.topic.asc())
        .all()
    )
    return ApiResponse(data=[CSProgressResponse.model_validate(row) for row in rows])


@router.put("/cs/{subject}/{topic}", response_model=ApiResponse[CSProgressResponse])
def upsert_cs_topic(
    subject: str,
    topic: str,
    body: CSProgressUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = (
        db.query(CSProgress)
        .filter(
            CSProgress.user_id == user.id,
            CSProgress.subject == subject.upper(),
            CSProgress.topic == topic,
        )
        .first()
    )
    if not row:
        row = CSProgress(user_id=user.id, subject=subject.upper(), topic=topic)
        db.add(row)
    row.status = body.status
    row.confidence = body.confidence
    db.commit()
    db.refresh(row)
    CacheService.delete(CacheService.learn_cs_summary_key(user.id))
    if body.status.value == "COMPLETED":
        record_activity(db, user.id)
        increment_goal(db, user.id, cs_delta=1)
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data=CSProgressResponse.model_validate(row))


@router.get("/cs/summary", response_model=ApiResponse[list[CSSummaryItem]])
def get_cs_summary(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cache_key = CacheService.learn_cs_summary_key(user.id)
    cached = CacheService.get(cache_key)
    if cached:
        return ApiResponse(data=[CSSummaryItem(**item) for item in cached])

    rows = db.query(CSProgress).filter(CSProgress.user_id == user.id).all()
    by_subject: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "completed": 0})
    for row in rows:
        by_subject[row.subject]["total"] += 1
        if row.status.value == "COMPLETED":
            by_subject[row.subject]["completed"] += 1
    summary = [
        CSSummaryItem(
            subject=subject,
            total_topics=data["total"],
            completed_topics=data["completed"],
            completion_percent=round((data["completed"] / data["total"]) * 100, 1) if data["total"] else 0.0,
        )
        for subject, data in sorted(by_subject.items())
    ]
    CacheService.set(cache_key, [item.model_dump() for item in summary], CacheService.TTL_LEARN_SUMMARY)
    return ApiResponse(data=summary)


@router.get("/aptitude/{section}", response_model=ApiResponse[list[AptitudeProgressResponse]])
def get_aptitude_section(
    section: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = (
        db.query(AptitudeProgress)
        .filter(AptitudeProgress.user_id == user.id, AptitudeProgress.section == section.upper())
        .order_by(AptitudeProgress.topic.asc())
        .all()
    )
    return ApiResponse(data=[AptitudeProgressResponse.model_validate(row) for row in rows])


@router.put("/aptitude/{section}/{topic}", response_model=ApiResponse[AptitudeProgressResponse])
def upsert_aptitude_topic(
    section: str,
    topic: str,
    body: AptitudeProgressUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if body.correct > body.attempted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Correct count cannot exceed attempted")
    row = (
        db.query(AptitudeProgress)
        .filter(
            AptitudeProgress.user_id == user.id,
            AptitudeProgress.section == section.upper(),
            AptitudeProgress.topic == topic,
        )
        .first()
    )
    if not row:
        row = AptitudeProgress(user_id=user.id, section=section.upper(), topic=topic)
        db.add(row)
    row.attempted = body.attempted
    row.correct = body.correct
    db.commit()
    db.refresh(row)
    record_activity(db, user.id)
    return ApiResponse(data=AptitudeProgressResponse.model_validate(row))
