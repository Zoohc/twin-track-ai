from __future__ import annotations
import uuid
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query

from backend.db.supabase import get_client, encode_cursor, decode_cursor
from backend.models.report import Report, PaginatedReports

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return x_user_id


@router.get("", response_model=PaginatedReports)
async def list_reports(
    limit: int = Query(default=20, ge=1, le=100),
    after: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> PaginatedReports:
    user_id = _require_user(x_user_id)
    db = get_client()

    query = (
        db.table("reports")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .order("id", desc=True)
        .limit(limit + 1)
    )

    if after:
        cursor = decode_cursor(after)
        query = query.or_(
            f"created_at.lt.{cursor['created_at']},"
            f"and(created_at.eq.{cursor['created_at']},id.lt.{cursor['id']})"
        )

    rows = query.execute().data or []
    has_next = len(rows) > limit
    items = rows[:limit]

    next_cursor: Optional[str] = None
    if has_next and items:
        last = items[-1]
        next_cursor = encode_cursor(last["created_at"], last["id"])

    return PaginatedReports(
        items=[Report(**r) for r in items],
        next_cursor=next_cursor,
        has_next=has_next,
    )


@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: uuid.UUID,
    x_user_id: Optional[str] = Header(default=None),
) -> Report:
    user_id = _require_user(x_user_id)
    db = get_client()

    result = (
        db.table("reports")
        .select("*")
        .eq("id", str(report_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다")

    return Report(**result.data)
