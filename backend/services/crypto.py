from __future__ import annotations
import os
from cryptography.fernet import Fernet

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = os.environ["ENCRYPTION_KEY"].encode()
        _fernet = Fernet(key)
    return _fernet


def encrypt(plaintext: str) -> str:
    """평문 API Key를 Fernet으로 암호화합니다."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """암호화된 API Key를 복호화합니다."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
