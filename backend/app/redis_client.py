from typing import Optional

import redis

from app.config import get_settings


class RedisClient:
    _instance: Optional[redis.Redis] = None

    @classmethod
    def get_client(cls) -> Optional[redis.Redis]:
        settings = get_settings()
        if not settings.redis_url:
            return None
        if cls._instance is None:
            cls._instance = redis.from_url(
                settings.redis_url,
                password=settings.redis_token or None,
                decode_responses=True,
            )
        return cls._instance
