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

    # Phase 7 — coding judge (Judge0 / piston). Empty => mock verdicts.
    judge_url: str = ""
    judge_provider: str = "judge0"  # "judge0" | "piston"
    judge_api_key: str = ""

    # Phase 9 — billing. Empty keys => mock/feature-flagged provider.
    billing_enabled: bool = False
    billing_provider: str = "stripe"  # "stripe" | "razorpay"
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # Phase 9 — advanced AI / PWA push
    embeddings_model: str = "voyage-3-lite"
    vapid_public_key: str = ""

    # Phase 9 — scale / connection pooling
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 1800


@lru_cache
def get_settings() -> Settings:
    return Settings()
