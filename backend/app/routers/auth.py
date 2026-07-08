from typing import Annotated

import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_auth_service, get_current_user, integration_status
from app.models import OAuthProvider, User
from app.schemas.auth import ProfileResponse, UserResponse
from app.schemas.common import ApiResponse
from app.services.auth import AuthService
from app.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

oauth = OAuth()

if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if settings.github_client_id and settings.github_client_secret:
    oauth.register(
        name="github",
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email read:user repo"},
    )


def _set_auth_cookies(response: Response, auth_service: AuthService, user: User) -> None:
    cookie_opts = auth_service.cookie_settings()
    response.set_cookie(
        key=AuthService.ACCESS_COOKIE,
        value=auth_service.create_access_token(user.id, user.role),
        max_age=settings.access_token_expire_minutes * 60,
        **cookie_opts,
    )
    response.set_cookie(
        key=AuthService.REFRESH_COOKIE,
        value=auth_service.create_refresh_token(user.id),
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        **cookie_opts,
    )


def _clear_auth_cookies(response: Response, auth_service: AuthService) -> None:
    cookie_opts = auth_service.cookie_settings()
    response.delete_cookie(AuthService.ACCESS_COOKIE, path="/")
    response.delete_cookie(AuthService.REFRESH_COOKIE, path="/")
    for key in (AuthService.ACCESS_COOKIE, AuthService.REFRESH_COOKIE):
        response.set_cookie(key=key, value="", max_age=0, **cookie_opts)


def _serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        role=user.role.value,
        created_at=user.created_at,
        profile=ProfileResponse.model_validate(user.profile) if user.profile else None,
        leetcode=integration_status(user.leetcode_integration),
        github=integration_status(user.github_integration),
    )


@router.get("/google")
@limiter.limit("5/minute")
async def google_login(request: Request):
    if "google" not in oauth._clients:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")
    redirect_uri = f"{settings.api_url}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.post("/google/calendar")
@limiter.limit("5/minute")
async def google_calendar_scope(request: Request):
    if "google" not in oauth._clients:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")
    redirect_uri = f"{settings.api_url}/auth/google/callback"
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri,
        scope=f"openid email profile {settings.google_calendar_scope}",
        prompt="consent",
    )


@router.get("/google/callback")
@limiter.limit("5/minute")
async def google_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    if "google" not in oauth._clients:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")

    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch Google user info")

    user = auth_service.get_or_create_user_from_oauth(
        db,
        provider=OAuthProvider.GOOGLE,
        provider_account_id=userinfo["sub"],
        email=userinfo["email"],
        name=userinfo.get("name"),
        avatar_url=userinfo.get("picture"),
        access_token=token.get("access_token"),
        refresh_token=token.get("refresh_token"),
    )

    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard", status_code=302)
    _set_auth_cookies(response, auth_service, user)
    return response


@router.get("/github")
@limiter.limit("5/minute")
async def github_login(request: Request):
    if "github" not in oauth._clients:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub OAuth not configured")
    redirect_uri = f"{settings.api_url}/auth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
@limiter.limit("5/minute")
async def github_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    if "github" not in oauth._clients:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub OAuth not configured")

    token = await oauth.github.authorize_access_token(request)
    access_token = token.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch GitHub access token")

    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
        user_resp.raise_for_status()
        gh_user = user_resp.json()

        email = gh_user.get("email")
        if not email:
            emails_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
            emails_resp.raise_for_status()
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get("primary")), emails[0] if emails else None)
            email = primary["email"] if primary else f"{gh_user['id']}@users.noreply.github.com"

    user = auth_service.get_or_create_user_from_oauth(
        db,
        provider=OAuthProvider.GITHUB,
        provider_account_id=str(gh_user["id"]),
        email=email,
        name=gh_user.get("name") or gh_user.get("login"),
        avatar_url=gh_user.get("avatar_url"),
        access_token=access_token,
        refresh_token=token.get("refresh_token"),
    )

    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard?github_sync=1", status_code=302)
    _set_auth_cookies(response, auth_service, user)
    return response


@router.post("/logout")
def logout(
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    response = RedirectResponse(url=f"{settings.frontend_url}/login", status_code=302)
    _clear_auth_cookies(response, auth_service)
    return response


@router.post("/refresh")
@limiter.limit("5/minute")
def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    refresh = request.cookies.get(AuthService.REFRESH_COOKIE)
    if not refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    try:
        payload = auth_service.decode_refresh_token(refresh)
        user_id = payload.get("sub")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    _set_auth_cookies(response, auth_service, user)
    return ApiResponse(message="Token refreshed")


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(user: Annotated[User, Depends(get_current_user)]):
    return ApiResponse(data=_serialize_user(user))
