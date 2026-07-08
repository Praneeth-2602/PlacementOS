from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models import (
    GitHubIntegration,
    LeetCodeIntegration,
    OAuthAccount,
    OAuthProvider,
    Profile,
    ReadinessScore,
    User,
    UserRole,
)
from app.services.encryption import encrypt_token


class AuthService:
    ACCESS_COOKIE = "access_token"
    REFRESH_COOKIE = "refresh_token"

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def create_access_token(self, user_id: str, role: UserRole) -> str:
        expire = datetime.now(UTC) + timedelta(minutes=self.settings.access_token_expire_minutes)
        payload = {"sub": user_id, "role": role.value, "type": "access", "exp": expire}
        return jwt.encode(payload, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm)

    def create_refresh_token(self, user_id: str) -> str:
        expire = datetime.now(UTC) + timedelta(days=self.settings.refresh_token_expire_days)
        payload = {"sub": user_id, "type": "refresh", "exp": expire}
        return jwt.encode(payload, self.settings.jwt_refresh_secret, algorithm=self.settings.jwt_algorithm)

    def decode_access_token(self, token: str) -> dict[str, Any]:
        payload = jwt.decode(token, self.settings.jwt_secret, algorithms=[self.settings.jwt_algorithm])
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload

    def decode_refresh_token(self, token: str) -> dict[str, Any]:
        payload = jwt.decode(token, self.settings.jwt_refresh_secret, algorithms=[self.settings.jwt_algorithm])
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        return payload

    def get_or_create_user_from_oauth(
        self,
        db: Session,
        *,
        provider: OAuthProvider,
        provider_account_id: str,
        email: str,
        name: str | None,
        avatar_url: str | None,
        access_token: str | None = None,
        refresh_token: str | None = None,
    ) -> User:
        def _ensure_user_defaults(target: User) -> None:
            if not db.query(Profile).filter(Profile.user_id == target.id).first():
                db.add(Profile(user_id=target.id))
            if not db.query(ReadinessScore).filter(ReadinessScore.user_id == target.id).first():
                db.add(ReadinessScore(user_id=target.id))
            if not db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == target.id).first():
                db.add(LeetCodeIntegration(user_id=target.id))
            if not db.query(GitHubIntegration).filter(GitHubIntegration.user_id == target.id).first():
                db.add(GitHubIntegration(user_id=target.id))

        def _update_github(target: User, token: str | None, username: str | None) -> None:
            if not token:
                return
            github = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == target.id).first()
            if github:
                github.access_token = encrypt_token(token)
                github.is_connected = True
                if username:
                    github.username = username

        oauth = (
            db.query(OAuthAccount)
            .filter(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_account_id == provider_account_id,
            )
            .first()
        )

        if oauth:
            user = oauth.user
            oauth.access_token = access_token
            oauth.refresh_token = refresh_token
            if name:
                user.name = name
            if avatar_url:
                user.avatar_url = avatar_url
            _ensure_user_defaults(user)
            if provider == OAuthProvider.GITHUB:
                _update_github(user, access_token, name)
            db.commit()
            db.refresh(user)
            return user

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, name=name, avatar_url=avatar_url)
            db.add(user)
            db.flush()
            _ensure_user_defaults(user)
        else:
            _ensure_user_defaults(user)

        db.add(
            OAuthAccount(
                user_id=user.id,
                provider=provider,
                provider_account_id=provider_account_id,
                access_token=access_token,
                refresh_token=refresh_token,
            )
        )

        if provider == OAuthProvider.GITHUB:
            _update_github(user, access_token, name)

        db.commit()
        db.refresh(user)
        return user

    def cookie_settings(self) -> dict[str, Any]:
        return {
            "httponly": True,
            "secure": self.settings.cookie_secure,
            "samesite": self.settings.cookie_samesite,
            "path": "/",
        }
