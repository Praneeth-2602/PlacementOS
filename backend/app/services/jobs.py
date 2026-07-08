import uuid
from typing import Any

from arq import create_pool
from arq.connections import RedisSettings

from app.config import get_settings
from app.database import SessionLocal
from app.services.github import run_github_sync
from app.services.leetcode import run_leetcode_sync
from app.services.readiness.engine import ReadinessEngine
from app.workers.tasks import deadline_reminder

_memory_jobs: list[dict[str, Any]] = []


async def _run_inline(job_name: str, **kwargs: Any) -> str:
    job_id = str(uuid.uuid4())
    _memory_jobs.append({"job_id": job_id, "function": job_name, "kwargs": kwargs, "status": "complete"})
    db = SessionLocal()
    try:
        if job_name == "leetcode_sync":
            await run_leetcode_sync(db, kwargs["user_id"], kwargs["username"])
        elif job_name == "github_sync":
            await run_github_sync(db, kwargs["user_id"])
        elif job_name == "score_recalc":
            ReadinessEngine(db).recalculate(kwargs["user_id"])
        elif job_name == "deadline_reminder":
            await deadline_reminder({})
    finally:
        db.close()
    return job_id


async def enqueue_job(job_name: str, **kwargs: Any) -> str:
    settings = get_settings()
    if not settings.redis_url:
        return await _run_inline(job_name, **kwargs)

    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    if settings.redis_token:
        redis_settings.password = settings.redis_token

    pool = await create_pool(redis_settings)
    try:
        job = await pool.enqueue_job(job_name, **kwargs)
        return job.job_id if job else str(uuid.uuid4())
    finally:
        await pool.close()


def list_recent_jobs(limit: int = 50) -> list[dict[str, Any]]:
    return list(reversed(_memory_jobs[-limit:]))
