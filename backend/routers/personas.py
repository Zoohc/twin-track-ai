from __future__ import annotations
import uuid
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from backend.db.supabase import get_client
from backend.models.persona import Persona, PersonaCreate
from backend.services.persona_builder import DEFAULT_PERSONAS, build_system_prompt

router = APIRouter(prefix="/api/personas", tags=["personas"])


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return x_user_id


@router.get("", response_model=list[Persona])
async def list_personas(
    x_user_id: Optional[str] = Header(default=None),
) -> list[Persona]:
    user_id = _require_user(x_user_id)
    db = get_client()

    # DB에서 기본 페르소나 + 유저 커스텀 페르소나 조회
    result = (
        db.table("personas")
        .select("*")
        .or_(f"is_default.eq.true,user_id.eq.{user_id}")
        .order("created_at", desc=False)
        .execute()
    )

    return [Persona(**row) for row in (result.data or [])]


@router.post("", response_model=Persona)
async def create_persona(
    body: PersonaCreate,
    x_user_id: Optional[str] = Header(default=None),
) -> Persona:
    """Pro 전용: 커스텀 페르소나 생성."""
    user_id = _require_user(x_user_id)
    db = get_client()

    # Pro 플랜 확인
    profile = db.table("profiles").select("plan").eq("id", user_id).single().execute()
    if not profile.data or profile.data.get("plan") != "pro":
        raise HTTPException(status_code=403, detail="Pro 플랜에서만 커스텀 페르소나를 생성할 수 있습니다")

    # 시스템 프롬프트 자동 생성 (임시: 기본 구조 사용)
    system_prompt = (
        f"You are {body.name}. {body.description}\n"
        "Your goal: explore the site thoroughly and report any issues you encounter."
    )

    result = (
        db.table("personas")
        .insert(
            {
                "user_id": user_id,
                "name": body.name,
                "description": body.description,
                "system_prompt": system_prompt,
                "is_default": False,
            }
        )
        .select("*")
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="페르소나 생성 실패")

    return Persona(**result.data)


@router.delete("/{persona_id}", status_code=204)
async def delete_persona(
    persona_id: uuid.UUID,
    x_user_id: Optional[str] = Header(default=None),
) -> None:
    user_id = _require_user(x_user_id)
    db = get_client()

    result = (
        db.table("personas")
        .delete()
        .eq("id", str(persona_id))
        .eq("user_id", user_id)
        .eq("is_default", False)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="삭제할 수 없는 페르소나입니다")
