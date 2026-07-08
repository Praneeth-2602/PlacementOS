from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import boto3
from botocore.config import Config

from app.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_dir = Path(self.settings.local_storage_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    @property
    def r2_enabled(self) -> bool:
        return bool(
            self.settings.r2_account_id
            and self.settings.r2_access_key_id
            and self.settings.r2_secret_access_key
            and self.settings.r2_bucket
        )

    def _r2_client(self):
        return boto3.client(
            "s3",
            endpoint_url=f"https://{self.settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=self.settings.r2_access_key_id,
            aws_secret_access_key=self.settings.r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

    def save_bytes(self, key: str, content: bytes, content_type: str = "application/pdf") -> str:
        if self.r2_enabled:
            client = self._r2_client()
            client.put_object(Bucket=self.settings.r2_bucket, Key=key, Body=content, ContentType=content_type)
            return f"r2://{self.settings.r2_bucket}/{key}"

        target = self.base_dir / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return str(target)

    def delete(self, url_or_path: str | None) -> None:
        if not url_or_path:
            return
        if url_or_path.startswith("r2://") and self.r2_enabled:
            parsed = urlparse(url_or_path.replace("r2://", "https://", 1))
            bucket = parsed.netloc
            key = parsed.path.lstrip("/")
            self._r2_client().delete_object(Bucket=bucket, Key=key)
            return
        try:
            path = Path(url_or_path)
            if path.exists():
                os.remove(path)
        except Exception:
            pass
