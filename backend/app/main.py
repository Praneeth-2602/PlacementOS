import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.rate_limit import limiter
from app.routers import (
    admin,
    auth,
    build,
    dashboard,
    github,
    health,
    interview_twin,
    learn,
    leetcode,
    notes,
    notifications,
    opportunities,
    prepare,
    push,
    readiness,
    resume,
    track,
    users,
)

settings = get_settings()

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration

    sentry_sdk.init(dsn=settings.sentry_dsn, integrations=[FastApiIntegration()], traces_sample_rate=0.1)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(leetcode.router)
    app.include_router(github.router)
    app.include_router(readiness.router)
    app.include_router(dashboard.router)
    app.include_router(learn.router)
    app.include_router(notes.router)
    app.include_router(prepare.router)
    app.include_router(opportunities.router)
    app.include_router(resume.router)
    app.include_router(build.router)
    app.include_router(notifications.router)
    app.include_router(users.router)
    app.include_router(interview_twin.router)
    app.include_router(track.router)
    app.include_router(push.router)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        from app.middleware import problem_detail_handler

        return await problem_detail_handler(request, exc)

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        from app.middleware import problem_detail_handler

        return await problem_detail_handler(request, exc)

    return app


app = create_app()
