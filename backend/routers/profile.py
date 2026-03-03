from __future__ import annotations
from typing import Optional, Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from backend.db.supabase import get_client
from backend.services.crypto import encrypt

router = APIRouter(prefix="/api/profile", tags=["profile"])

LLMProviderType = Literal["openai", "anthropic"]


class ProfileResponse(BaseModel):
    id: str
    email: str
    plan: str
    llm_provider: Optional[str] = None
    created_at: str


class ApiKeyUpdateRequest(BaseModel):
    llm_provider: LLMProviderType
    llm_api_key: str


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return x_user_id


@router.get("", response_model=ProfileResponse)
async def get_profile(
    x_user_id: Optional[str] = Header(default=None),
) -> ProfileResponse:
    user_id = _require_user(x_user_id)
    db = get_client()

    result = (
        db.table("profiles")
        .select("id, email, plan, llm_provider, created_at")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다")

    return ProfileResponse(**result.data)


@router.put("/api-key", status_code=204)
async def update_api_key(
    body: ApiKeyUpdateRequest,
    x_user_id: Optional[str] = Header(default=None),
) -> None:
    user_id = _require_user(x_user_id)

    if not body.llm_api_key.strip():
        raise HTTPException(status_code=400, detail="API Key가 비어있습니다")

    encrypted = encrypt(body.llm_api_key.strip())
    db = get_client()

    db.table("profiles").update(
        {
            "llm_provider": body.llm_provider,
            "llm_api_key_enc": encrypted,
        }
    ).eq("id", user_id).execute()
