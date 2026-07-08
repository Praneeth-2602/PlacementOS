import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import get_settings


def _fernet() -> Fernet:
  settings = get_settings()
  digest = hashlib.sha256(settings.jwt_secret.encode()).digest()
  key = base64.urlsafe_b64encode(digest)
  return Fernet(key)


def encrypt_token(token: str) -> str:
  return _fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
  return _fernet().decrypt(encrypted.encode()).decode()
