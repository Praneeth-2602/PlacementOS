from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.readiness import ReadinessResponse
from app.services.cache import CacheService
from app.services.readiness.engine import ReadinessEngine

router = APIRouter(prefix="/readiness", tags=["readiness"])


@router.get("", response_model=ApiResponse[ReadinessResponse])
def get_readiness(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    record = ReadinessEngine(db).get_or_recalculate(user.id)
    return ApiResponse(data=ReadinessResponse.model_validate(record))


@router.post("/recalculate", response_model=ApiResponse[ReadinessResponse])
def recalculate_readiness(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    record = ReadinessEngine(db).recalculate(user.id)
    CacheService.delete(CacheService.dashboard_key(user.id))
    return ApiResponse(data=ReadinessResponse.model_validate(record))


@router.get("/recommendations", response_model=ApiResponse[list[dict]])
def recommendations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=ReadinessEngine(db).recommendations(user.id))


@router.get("/by-company/{company_name}", response_model=ApiResponse[dict])
def by_company(
    company_name: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=ReadinessEngine(db).readiness_by_company(user.id, company_name))


@router.get("/benchmarks", response_model=ApiResponse[dict])
def benchmarks(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=ReadinessEngine(db).benchmarks(user.id))
