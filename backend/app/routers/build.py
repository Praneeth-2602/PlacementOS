from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import GitHubIntegration, GitHubRepo, Project, User
from app.schemas.build import LinkRepoRequest, ProjectCreateRequest, ProjectResponse, ProjectUpdateRequest
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/build", tags=["build"])


@router.get("/projects", response_model=ApiResponse[list[ProjectResponse]])
def list_projects(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Project).filter(Project.user_id == user.id).order_by(Project.updated_at.desc()).all()
    return ApiResponse(data=[ProjectResponse.model_validate(row) for row in rows])


@router.post("/projects", response_model=ApiResponse[ProjectResponse])
def create_project(
    body: ProjectCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = Project(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ProjectResponse.model_validate(row))


@router.put("/projects/{project_id}", response_model=ApiResponse[ProjectResponse])
def update_project(
    project_id: str,
    body: ProjectUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ProjectResponse.model_validate(row))


@router.delete("/projects/{project_id}", response_model=ApiResponse[dict])
def delete_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(row)
    db.commit()
    return ApiResponse(data={"deleted": True})


@router.put("/projects/{project_id}/feature", response_model=ApiResponse[ProjectResponse])
def toggle_feature_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    row.is_featured = not row.is_featured
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ProjectResponse.model_validate(row))


@router.put("/projects/{project_id}/link-repo", response_model=ApiResponse[ProjectResponse])
def link_repo(
    project_id: str,
    body: LinkRepoRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    integration = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == user.id).first()
    if not integration:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub not connected")
    repo = (
        db.query(GitHubRepo)
        .filter(GitHubRepo.id == body.repo_id, GitHubRepo.integration_id == integration.id)
        .first()
    )
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    row.github_repo_id = repo.id
    row.github_url = f"https://github.com/{repo.full_name}"
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ProjectResponse.model_validate(row))


@router.get("/portfolio", response_model=ApiResponse[dict])
def portfolio(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == user.id, Project.is_featured.is_(True))
        .order_by(Project.updated_at.desc())
        .all()
    )
    integration = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == user.id).first()
    repos = []
    if integration:
        repos = (
            db.query(GitHubRepo)
            .filter(GitHubRepo.integration_id == integration.id, GitHubRepo.is_featured.is_(True))
            .order_by(GitHubRepo.stars.desc())
            .all()
        )
    return ApiResponse(
        data={
            "projects": [ProjectResponse.model_validate(p).model_dump() for p in projects],
            "repos": [
                {
                    "id": r.id,
                    "name": r.name,
                    "full_name": r.full_name,
                    "language": r.language,
                    "stars": r.stars,
                    "pushed_at": r.pushed_at,
                }
                for r in repos
            ],
        }
    )
