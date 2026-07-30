from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import CodingProblem, Submission, SubmissionVerdict, User
from app.rate_limit import limiter
from app.schemas.common import ApiResponse
from app.schemas.practice import ProblemDetail, ProblemSummary, SubmissionResponse, SubmitRequest
from app.services.jobs import enqueue_job
from app.services.recommendations import recommend_problems

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/problems", response_model=ApiResponse[list[ProblemSummary]])
def list_problems(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    topic: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
):
    query = db.query(CodingProblem).filter(CodingProblem.is_active.is_(True))
    if topic:
        query = query.filter(CodingProblem.topic == topic)
    if difficulty:
        query = query.filter(CodingProblem.difficulty == difficulty.upper())
    rows = query.order_by(CodingProblem.title.asc()).all()
    return ApiResponse(data=[ProblemSummary.model_validate(r) for r in rows])


@router.get("/recommendations", response_model=ApiResponse[list[ProblemSummary]])
def recommendations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=5, le=20),
):
    """Embeddings-based problem recommendations (Phase 9), with a heuristic fallback."""
    rows = recommend_problems(db, user.id, limit=limit)
    return ApiResponse(data=[ProblemSummary.model_validate(r) for r in rows])


@router.get("/problems/{problem_id}", response_model=ApiResponse[ProblemDetail])
def get_problem(
    problem_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return ApiResponse(data=ProblemDetail.model_validate(problem))


@router.post("/problems/{problem_id}/submit", response_model=ApiResponse[dict])
@limiter.limit("30/minute")
async def submit_solution(
    request: Request,
    problem_id: str,
    body: SubmitRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    submission = Submission(
        user_id=user.id,
        problem_id=problem_id,
        language=body.language,
        code=body.code,
        verdict=SubmissionVerdict.PENDING,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    job_id = await enqueue_job("judge_run", submission_id=submission.id)
    db.refresh(submission)
    return ApiResponse(
        data={"submission_id": submission.id, "job_id": job_id, "verdict": submission.verdict.value}
    )


@router.get("/submissions/{submission_id}", response_model=ApiResponse[SubmissionResponse])
def get_submission(
    submission_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return ApiResponse(data=SubmissionResponse.model_validate(row))
