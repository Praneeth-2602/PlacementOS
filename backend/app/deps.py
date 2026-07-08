from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import GitHubIntegration, LeetCodeIntegration, User, UserRole
from app.services.auth import AuthService


def get_auth_service() -> AuthService:
    return AuthService()


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    token = request.cookies.get(AuthService.ACCESS_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = auth_service.decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = (
        db.query(User)
        .options(
            joinedload(User.profile),
            joinedload(User.leetcode_integration),
            joinedload(User.github_integration),
        )
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: UserRole):
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker


def integration_status(integration: LeetCodeIntegration | GitHubIntegration | None) -> dict | None:
    if not integration:
        return None
    return {
        "is_connected": integration.is_connected,
        "username": integration.username,
        "last_synced_at": integration.last_synced_at,
        "sync_status": integration.sync_status,
    }
