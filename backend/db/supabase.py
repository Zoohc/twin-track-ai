from __future__ import annotations
import os
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


# 커서 기반 페이징 유틸
import base64
import json


def encode_cursor(created_at: str, row_id: str) -> str:
    payload = json.dumps({"created_at": created_at, "id": row_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> dict[str, str]:
    payload = base64.urlsafe_b64decode(cursor.encode()).decode()
    return json.loads(payload)
