from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "PlacementOS API"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = "sqlite:///./placementos.db"
    redis_url: str = ""
    redis_token: str = ""

    jwt_secret: str = "dev-jwt-secret-change-in-production"
    jwt_refresh_secret: str = "dev-refresh-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    frontend_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"

    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    sentry_dsn: str = ""

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""

    resend_api_key: str = ""
    local_storage_dir: str = "./storage"

    google_calendar_scope: str = "https://www.googleapis.com/auth/calendar.events"


@lru_cache
def get_settings() -> Settings:
    return Settings()
