import json
from typing import Any

from app.redis_client import RedisClient

_memory: dict[str, str] = {}


class CacheService:
  TTL_LEETCODE_STATS = 30 * 60
  TTL_DASHBOARD = 5 * 60
  TTL_LEARN_SUMMARY = 15 * 60

  @staticmethod
  def _key(key: str) -> str:
    return key

  @classmethod
  def get(cls, key: str) -> Any | None:
    client = RedisClient.get_client()
    if client:
      raw = client.get(cls._key(key))
      return json.loads(raw) if raw else None
    raw = _memory.get(key)
    return json.loads(raw) if raw else None

  @classmethod
  def set(cls, key: str, value: Any, ttl: int) -> None:
    payload = json.dumps(value, default=str)
    client = RedisClient.get_client()
    if client:
      client.setex(cls._key(key), ttl, payload)
      return
    _memory[key] = payload

  @classmethod
  def delete(cls, key: str) -> None:
    client = RedisClient.get_client()
    if client:
      client.delete(cls._key(key))
      return
    _memory.pop(key, None)

  @classmethod
  def leetcode_stats_key(cls, user_id: str) -> str:
    return f"leetcode:stats:{user_id}"

  @classmethod
  def dashboard_key(cls, user_id: str) -> str:
    return f"dashboard:summary:{user_id}"

  @classmethod
  def learn_cs_summary_key(cls, user_id: str) -> str:
    return f"learn:cs:summary:{user_id}"
