import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import GitHubIntegration, GitHubRepo, User
from app.schemas.common import ApiResponse
from app.schemas.github import GitHubActivityResponse, GitHubRepoResponse
from app.schemas.leetcode import SyncJobResponse
from app.services.github import can_sync, get_github_token
from app.services.jobs import enqueue_job

router = APIRouter(prefix="/github", tags=["github"])


@router.post("/sync", response_model=ApiResponse[SyncJobResponse])
async def sync_github(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == user.id).first()
    if not can_sync(integration):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 15 minutes between GitHub syncs",
        )

    try:
        get_github_token(db, user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job_id = await enqueue_job("github_sync", user_id=user.id)
    return ApiResponse(data=SyncJobResponse(job_id=job_id))


@router.get("/repos", response_model=ApiResponse[list[GitHubRepoResponse]])
def list_repos(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = (
        db.query(GitHubIntegration)
        .options(joinedload(GitHubIntegration.repos))
        .filter(GitHubIntegration.user_id == user.id)
        .first()
    )
    if not integration:
        return ApiResponse(data=[])
    repos = sorted(integration.repos, key=lambda r: r.stars, reverse=True)
    return ApiResponse(data=[GitHubRepoResponse.model_validate(r) for r in repos])


@router.get("/repos/featured", response_model=ApiResponse[list[GitHubRepoResponse]])
def list_featured_repos(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == user.id).first()
    if not integration:
        return ApiResponse(data=[])
    repos = (
        db.query(GitHubRepo)
        .filter(GitHubRepo.integration_id == integration.id, GitHubRepo.is_featured.is_(True))
        .all()
    )
    return ApiResponse(data=[GitHubRepoResponse.model_validate(r) for r in repos])


@router.put("/repos/{repo_id}/feature", response_model=ApiResponse[GitHubRepoResponse])
def toggle_feature(
    repo_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == user.id).first()
    if not integration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GitHub not connected")

    repo = (
        db.query(GitHubRepo)
        .filter(GitHubRepo.id == repo_id, GitHubRepo.integration_id == integration.id)
        .first()
    )
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    repo.is_featured = not repo.is_featured
    db.commit()
    db.refresh(repo)
    return ApiResponse(data=GitHubRepoResponse.model_validate(repo))


@router.get("/activity", response_model=ApiResponse[GitHubActivityResponse])
def get_activity(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = (
        db.query(GitHubIntegration)
        .options(joinedload(GitHubIntegration.activity_stats))
        .filter(GitHubIntegration.user_id == user.id)
        .first()
    )
    if not integration or not integration.activity_stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GitHub activity not found")

    activity = integration.activity_stats
    return ApiResponse(
        data=GitHubActivityResponse(
            total_contributions=activity.total_contributions,
            contribution_calendar=activity.contribution_calendar,
            updated_at=activity.updated_at,
        )
    )


@router.get("/sync/status")
async def sync_status_sse(user: Annotated[User, Depends(get_current_user)]):
    from app.services.sync_status import SyncStatusService

    async def event_stream():
        async for payload in SyncStatusService.stream("github", user.id):
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
