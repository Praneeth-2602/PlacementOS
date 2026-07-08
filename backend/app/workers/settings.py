from app.config import get_settings
from app.workers.tasks import deadline_reminder, github_sync, leetcode_sync, score_recalc

settings = get_settings()

try:
    from arq.connections import RedisSettings

    _redis_settings = RedisSettings.from_dsn(settings.redis_url) if settings.redis_url else RedisSettings()
    if settings.redis_token:
        _redis_settings.password = settings.redis_token
except Exception:
    from arq.connections import RedisSettings

    _redis_settings = RedisSettings()


class WorkerSettings:
    functions = [leetcode_sync, github_sync, score_recalc, deadline_reminder]
    try:
        from arq import cron

        cron_jobs = [cron(deadline_reminder, hour=21, minute=0)]
    except Exception:
        cron_jobs = []
    redis_settings = _redis_settings
    max_tries = 3
    job_timeout = 300
