import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import LeetCodeIntegration, LeetCodeTopicProgress, User
from app.schemas.common import ApiResponse
from app.schemas.leetcode import (
    LeetCodeStatsResponse,
    LeetCodeSyncRequest,
    LeetCodeTopicResponse,
    SyncJobResponse,
)
from app.services.cache import CacheService
from app.services.jobs import enqueue_job
from app.services.leetcode import can_sync
from app.rate_limit import limiter

router = APIRouter(prefix="/leetcode", tags=["leetcode"])


@router.post("/sync", response_model=ApiResponse[SyncJobResponse])
@limiter.limit("2/minute")
async def sync_leetcode(
    request: Request,
    body: LeetCodeSyncRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required")

    integration = db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == user.id).first()
    if not can_sync(integration):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 15 minutes between LeetCode syncs",
        )

    job_id = await enqueue_job("leetcode_sync", user_id=user.id, username=username)
    return ApiResponse(data=SyncJobResponse(job_id=job_id))


@router.get("/stats", response_model=ApiResponse[LeetCodeStatsResponse])
def get_stats(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cache_key = CacheService.leetcode_stats_key(user.id)
    cached = CacheService.get(cache_key)
    if cached:
        return ApiResponse(data=LeetCodeStatsResponse(**cached))

    integration = (
        db.query(LeetCodeIntegration)
        .options(joinedload(LeetCodeIntegration.stats))
        .filter(LeetCodeIntegration.user_id == user.id)
        .first()
    )
    if not integration or not integration.stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LeetCode stats not found")

    data = LeetCodeStatsResponse.model_validate(integration.stats)
    CacheService.set(cache_key, data.model_dump(), CacheService.TTL_LEETCODE_STATS)
    return ApiResponse(data=data)


@router.get("/topics", response_model=ApiResponse[list[LeetCodeTopicResponse]])
def get_topics(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == user.id).first()
    if not integration:
        return ApiResponse(data=[])

    topics = (
        db.query(LeetCodeTopicProgress)
        .filter(LeetCodeTopicProgress.integration_id == integration.id)
        .order_by(LeetCodeTopicProgress.solved_count.desc())
        .all()
    )
    return ApiResponse(data=[LeetCodeTopicResponse.model_validate(t) for t in topics])


@router.put("/topics/{topic}/revision", response_model=ApiResponse[LeetCodeTopicResponse])
def toggle_revision(
    topic: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == user.id).first()
    if not integration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LeetCode not connected")

    row = (
        db.query(LeetCodeTopicProgress)
        .filter(
            LeetCodeTopicProgress.integration_id == integration.id,
            LeetCodeTopicProgress.topic == topic,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    row.needs_revision = not row.needs_revision
    db.commit()
    db.refresh(row)
    return ApiResponse(data=LeetCodeTopicResponse.model_validate(row))


@router.get("/sync/status")
async def sync_status_sse(user: Annotated[User, Depends(get_current_user)]):
    from app.services.sync_status import SyncStatusService

    async def event_stream():
        async for payload in SyncStatusService.stream("leetcode", user.id):
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
