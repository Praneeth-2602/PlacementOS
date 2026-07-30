from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.redis_client import RedisClient
from app.schemas.auth import HealthResponse
from app.schemas.common import ApiResponse

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health", response_model=ApiResponse[HealthResponse])
def health_check() -> ApiResponse[HealthResponse]:
    return ApiResponse(
        data=HealthResponse(status="ok", version=settings.app_version),
    )


@router.get("/health/ready", response_model=ApiResponse[dict])
def readiness_probe(db: Annotated[Session, Depends(get_db)]) -> ApiResponse[dict]:
    """Readiness probe: verify DB and (if configured) Redis are reachable."""
    checks: dict[str, str] = {}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:  # pragma: no cover - defensive
        checks["database"] = "error"

    if settings.redis_url:
        try:
            client = RedisClient.get_client()
            if client and client.ping():
                checks["redis"] = "ok"
            else:
                checks["redis"] = "error"
        except Exception:  # pragma: no cover - defensive
            checks["redis"] = "error"
    else:
        checks["redis"] = "skipped"

    ready = all(v in ("ok", "skipped") for v in checks.values())
    return ApiResponse(data={"ready": ready, "checks": checks}, message="ready" if ready else "degraded")
