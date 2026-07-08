import asyncio
import json
from collections import defaultdict
from typing import AsyncIterator, Literal

from app.redis_client import RedisClient

SyncState = Literal["idle", "syncing", "complete", "failed"]

_memory_status: dict[str, dict] = {}
_memory_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)


class SyncStatusService:
  @staticmethod
  def _key(sync_type: str, user_id: str) -> str:
    return f"sync:{sync_type}:{user_id}"

  @classmethod
  def get(cls, sync_type: str, user_id: str) -> dict:
    key = cls._key(sync_type, user_id)
    client = RedisClient.get_client()
    if client:
      raw = client.get(key)
      if raw:
        return json.loads(raw)
      return {"status": "idle", "progress": 0}
    return _memory_status.get(key, {"status": "idle", "progress": 0})

  @classmethod
  def set(cls, sync_type: str, user_id: str, status: SyncState, progress: int = 0) -> dict:
    payload = {"status": status, "progress": progress}
    key = cls._key(sync_type, user_id)
    client = RedisClient.get_client()
    if client:
      client.setex(key, 3600, json.dumps(payload))
    else:
      _memory_status[key] = payload
      for queue in _memory_subscribers.get(key, []):
        queue.put_nowait(payload)
    return payload

  @classmethod
  async def stream(cls, sync_type: str, user_id: str) -> AsyncIterator[dict]:
    key = cls._key(sync_type, user_id)
    client = RedisClient.get_client()
    if not client:
      queue: asyncio.Queue = asyncio.Queue()
      _memory_subscribers[key].append(queue)
      try:
        yield cls.get(sync_type, user_id)
        while True:
          payload = await asyncio.wait_for(queue.get(), timeout=30)
          yield payload
          if payload.get("status") in ("complete", "failed"):
            break
      finally:
        _memory_subscribers[key] = [q for q in _memory_subscribers[key] if q is not queue]
      return

    last = None
    for _ in range(120):
      payload = cls.get(sync_type, user_id)
      if payload != last:
        yield payload
        last = payload
        if payload.get("status") in ("complete", "failed"):
          break
      await asyncio.sleep(1)
