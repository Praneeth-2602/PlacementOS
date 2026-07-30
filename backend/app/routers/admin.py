from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import require_roles
from app.models import User, UserRole
from app.schemas.common import ApiResponse
from app.services.jobs import list_recent_jobs, queue_stats

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(user: Annotated[User, Depends(require_roles(UserRole.ADMIN))]):
    return ApiResponse(data={"message": "pong", "userId": user.id})


@router.get("/queues")
def admin_queues(user: Annotated[User, Depends(require_roles(UserRole.ADMIN))]):
    return ApiResponse(data={"jobs": list_recent_jobs()})


@router.get("/jobs")
async def admin_jobs(user: Annotated[User, Depends(require_roles(UserRole.ADMIN))]):
    """ARQ queue depth + recent job outcomes (Phase 6)."""
    return ApiResponse(data=await queue_stats())
