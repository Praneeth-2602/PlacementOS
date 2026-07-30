from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    GitHubIntegration,
    LeetCodeIntegration,
    Membership,
    MembershipStatus,
    Organization,
    OrgRole,
    User,
    UserRole,
)
from app.services.auth import AuthService
from app.services.entitlements import resolve_entitlements


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


@dataclass
class OrgContext:
    org: Organization
    membership: Membership | None
    user: User
    is_platform_admin: bool


def require_org_roles(*org_roles: OrgRole):
    """Resolve the caller's membership + org role for an ``/org/{org_id}`` route.

    Platform ``ADMIN`` users bypass the org-role check (membership may be None).
    Every tenant-scoped query downstream must still filter by ``ctx.org.id``.
    """

    def resolver(
        org_id: str,
        user: Annotated[User, Depends(get_current_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> OrgContext:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        membership = (
            db.query(Membership)
            .filter(
                Membership.org_id == org_id,
                Membership.user_id == user.id,
                Membership.status == MembershipStatus.ACTIVE,
            )
            .first()
        )
        is_platform_admin = user.role == UserRole.ADMIN
        if is_platform_admin:
            return OrgContext(org=org, membership=membership, user=user, is_platform_admin=True)
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")
        if org_roles and membership.org_role not in org_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization role")
        return OrgContext(org=org, membership=membership, user=user, is_platform_admin=False)

    return resolver


def get_entitlements(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return resolve_entitlements(db, user.id)


def require_entitlement(key: str):
    """Dependency factory gating an endpoint behind a plan entitlement."""

    def checker(
        user: Annotated[User, Depends(get_current_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> User:
        if not resolve_entitlements(db, user.id).get(key):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires an upgraded plan ({key})",
            )
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
