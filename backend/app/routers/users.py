from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Profile, User
from app.schemas.common import ApiResponse
from app.schemas.users import (
    OnboardingRequest,
    OnboardingStatusResponse,
    ProfileUpdateRequest,
    UserSettingsRequest,
)
from app.services.readiness.engine import ReadinessEngine

router = APIRouter(prefix="/users", tags=["users"])

_ONBOARDING_REQUIRED = ("university", "graduation_year", "target_role")


@router.get("/profile", response_model=ApiResponse[dict])
def get_profile(
    user: Annotated[User, Depends(get_current_user)],
):
    profile = user.profile
    return ApiResponse(
        data={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "profile": {
                "university": profile.university if profile else None,
                "graduation_year": profile.graduation_year if profile else None,
                "target_role": profile.target_role if profile else None,
                "bio": profile.bio if profile else None,
                "settings": profile.settings if profile else {},
            },
        }
    )


@router.put("/profile", response_model=ApiResponse[dict])
def update_profile(
    body: ProfileUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(user_id=user.id, settings={})
        db.add(profile)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return ApiResponse(
        data={
            "university": profile.university,
            "graduation_year": profile.graduation_year,
            "target_role": profile.target_role,
            "bio": profile.bio,
            "settings": profile.settings or {},
        }
    )


@router.put("/settings", response_model=ApiResponse[dict])
def update_settings(
    body: UserSettingsRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(user_id=user.id, settings={})
        db.add(profile)
        db.flush()
    settings = profile.settings or {}
    patch = body.model_dump(exclude_unset=True)
    settings.update(patch)
    profile.settings = settings
    db.commit()
    db.refresh(profile)
    return ApiResponse(data={"settings": profile.settings})


@router.post("/onboarding", response_model=ApiResponse[dict])
def submit_onboarding(
    body: OnboardingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """First-login profile setup; seeds the readiness engine (Phase 6)."""
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(user_id=user.id, settings={})
        db.add(profile)
    profile.university = body.university
    profile.graduation_year = body.graduation_year
    profile.target_role = body.target_role
    if body.target_companies is not None:
        profile.target_companies = body.target_companies
    if body.bio is not None:
        profile.bio = body.bio
    profile.onboarded_at = datetime.now(UTC)
    db.commit()
    db.refresh(profile)

    score = ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(
        data={
            "completed": True,
            "onboarded_at": profile.onboarded_at,
            "readiness": {"overall_score": score.overall_score},
        },
        message="Onboarding complete",
    )


@router.get("/onboarding/status", response_model=ApiResponse[OnboardingStatusResponse])
def onboarding_status(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    missing = [
        field
        for field in _ONBOARDING_REQUIRED
        if not (profile and getattr(profile, field, None) not in (None, ""))
    ]
    completed = bool(profile and profile.onboarded_at) and not missing
    return ApiResponse(data=OnboardingStatusResponse(completed=completed, missingFields=missing))
