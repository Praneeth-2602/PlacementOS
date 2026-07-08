from fastapi import APIRouter

from app.config import get_settings
from app.schemas.auth import HealthResponse
from app.schemas.common import ApiResponse

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health", response_model=ApiResponse[HealthResponse])
def health_check() -> ApiResponse[HealthResponse]:
    return ApiResponse(
        data=HealthResponse(status="ok", version=settings.app_version),
    )
