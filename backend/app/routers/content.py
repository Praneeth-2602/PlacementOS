from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Course, Lesson, LessonProgress, LessonStatus, User
from app.schemas.common import ApiResponse
from app.schemas.content import (
    CourseDetailResponse,
    CourseResponse,
    LessonProgressResponse,
    LessonProgressUpdateRequest,
    LessonResponse,
)
from app.services.gamification import XP_REWARDS, award_xp, check_badges
from app.services.readiness.engine import ReadinessEngine
from app.services.streak import record_activity

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/courses", response_model=ApiResponse[list[CourseResponse]])
def list_courses(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    track: str | None = Query(default=None),
):
    query = db.query(Course).filter(Course.published.is_(True))
    if track:
        query = query.filter(Course.track == track.upper())
    rows = query.order_by(Course.order.asc()).all()
    return ApiResponse(data=[CourseResponse.model_validate(r) for r in rows])


@router.get("/courses/{course_id}", response_model=ApiResponse[CourseDetailResponse])
def get_course(
    course_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return ApiResponse(data=CourseDetailResponse.model_validate(course))


@router.get("/lessons/{lesson_id}", response_model=ApiResponse[LessonResponse])
def get_lesson(
    lesson_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return ApiResponse(data=LessonResponse.model_validate(lesson))


@router.post("/lessons/{lesson_id}/progress", response_model=ApiResponse[LessonProgressResponse])
def update_lesson_progress(
    lesson_id: str,
    body: LessonProgressUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    row = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id == lesson_id)
        .first()
    )
    if not row:
        row = LessonProgress(user_id=user.id, lesson_id=lesson_id)
        db.add(row)
    was_completed = row.status == LessonStatus.COMPLETED
    row.status = body.status
    if body.status == LessonStatus.COMPLETED and not was_completed:
        row.completed_at = datetime.now(UTC)
    db.commit()
    db.refresh(row)

    if body.status == LessonStatus.COMPLETED and not was_completed:
        record_activity(db, user.id)
        award_xp(db, user.id, XP_REWARDS["lesson_completed"])
        check_badges(db, user.id)
        ReadinessEngine(db).recalculate(user.id)

    return ApiResponse(data=LessonProgressResponse.model_validate(row))
