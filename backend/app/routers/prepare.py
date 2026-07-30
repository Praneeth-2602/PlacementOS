from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_entitlement, require_roles
from app.models import InterviewSession, Question, StarTemplate, User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.prepare import (
    QuestionCreateRequest,
    QuestionResponse,
    QuestionUpdateRequest,
    SessionCreateRequest,
    SessionResponse,
    StarTemplateRequest,
    StarTemplateResponse,
)
from app.services.readiness.engine import ReadinessEngine
from app.services.streak import record_activity

router = APIRouter(prefix="/prepare", tags=["prepare"])


@router.get("/questions", response_model=ApiResponse[list[QuestionResponse]])
def list_questions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    type: str | None = Query(default=None),
    company: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    topic: str | None = Query(default=None),
):
    query = db.query(Question).filter(Question.is_active.is_(True))
    if type:
        query = query.filter(Question.type == type.upper())
    if company:
        query = query.filter(func.lower(Question.company) == company.lower())
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.upper())
    if topic:
        query = query.filter(func.lower(Question.topic) == topic.lower())
    rows = query.order_by(Question.created_at.desc()).all()
    return ApiResponse(data=[QuestionResponse.model_validate(row) for row in rows])


@router.get("/questions/{question_id}", response_model=ApiResponse[QuestionResponse])
def get_question(
    question_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Question).filter(Question.id == question_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return ApiResponse(data=QuestionResponse.model_validate(row))


@router.post("/questions", response_model=ApiResponse[QuestionResponse])
def create_question(
    body: QuestionCreateRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    row = Question(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=QuestionResponse.model_validate(row))


@router.put("/questions/{question_id}", response_model=ApiResponse[QuestionResponse])
def update_question(
    question_id: str,
    body: QuestionUpdateRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Question).filter(Question.id == question_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=QuestionResponse.model_validate(row))


@router.get("/star-templates", response_model=ApiResponse[list[StarTemplateResponse]])
def list_star_templates(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = (
        db.query(StarTemplate)
        .filter((StarTemplate.is_curated.is_(True)) | (StarTemplate.user_id == user.id))
        .order_by(StarTemplate.is_curated.desc(), StarTemplate.updated_at.desc())
        .all()
    )
    return ApiResponse(data=[StarTemplateResponse.model_validate(row) for row in rows])


@router.post("/star-templates", response_model=ApiResponse[StarTemplateResponse])
def create_star_template(
    body: StarTemplateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = StarTemplate(user_id=user.id, is_curated=False, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=StarTemplateResponse.model_validate(row))


@router.post("/sessions", response_model=ApiResponse[SessionResponse])
def create_session(
    body: SessionCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = InterviewSession(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    record_activity(db, user.id)
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data=SessionResponse.model_validate(row))


@router.get("/sessions", response_model=ApiResponse[list[SessionResponse]])
def list_sessions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(InterviewSession).filter(InterviewSession.user_id == user.id).order_by(InterviewSession.created_at.desc()).all()
    return ApiResponse(data=[SessionResponse.model_validate(row) for row in rows])


@router.post("/study-plan", response_model=ApiResponse[dict])
def study_plan(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    _gate: Annotated[User, Depends(require_entitlement("study_plan"))] = None,
):
    """Generate a personalized study plan from readiness gaps (Pro feature, Phase 9)."""
    from app.services.ai import generate_study_plan

    engine = ReadinessEngine(db)
    score = engine.get_or_recalculate(user.id)
    gaps = engine.recommendations(user.id)
    return ApiResponse(data=generate_study_plan(score, gaps))


@router.get("/sessions/stats", response_model=ApiResponse[dict])
def sessions_stats(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(InterviewSession).filter(InterviewSession.user_id == user.id).order_by(InterviewSession.created_at.asc()).all()
    if not rows:
        return ApiResponse(data={"total_sessions": 0, "avg_score": 0.0, "trend": []})
    avg_score = round(sum(float(r.self_score or 0) for r in rows) / len(rows), 2)
    trend = [{"date": r.created_at.date().isoformat(), "score": float(r.self_score or 0)} for r in rows]
    return ApiResponse(data={"total_sessions": len(rows), "avg_score": avg_score, "trend": trend})
