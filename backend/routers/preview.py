from __future__ import annotations
import asyncio
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["preview"])


@router.get("/preview-stream")
async def preview_stream(
    job_id: str = Query(..., description="스트리밍할 Job ID"),
) -> StreamingResponse:
    """
    SSE endpoint: 실행 중인 Job의 스크린샷을 스트리밍.
    feed_messages 테이블에서 screenshot_base64가 있는 메시지를 조회하여 전송.
    """
    return StreamingResponse(
        _event_generator(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


async def _event_generator(job_id: str) -> AsyncGenerator[str, None]:
    """
    Job이 running 상태인 동안 스크린샷을 폴링하여 전송.
    screenshot_base64가 있는 feed_message가 있으면 실제 스크린샷 전송.
    """
    from backend.db.supabase import get_client

    db = get_client()
    max_idle_seconds = 300
    idle_count = 0
    last_screenshot_id: str | None = None
    sent_loading = False

    while idle_count < max_idle_seconds:
        try:
            # Job 상태 확인
            result = (
                db.table("jobs").select("status").eq("id", job_id).single().execute()
            )
            status = result.data.get("status") if result.data else "done"

            if status in ("done", "failed"):
                # 마지막 스크린샷 확인
                latest = _get_latest_screenshot(db, job_id, last_screenshot_id)
                if latest:
                    yield f"data: {latest['base64']}\n\n"
                yield "data: done\n\n"
                break

            # 스크린샷 조회
            latest = _get_latest_screenshot(db, job_id, last_screenshot_id)
            if latest:
                last_screenshot_id = latest["id"]
                yield f"data: {latest['base64']}\n\n"
                sent_loading = True
            elif not sent_loading:
                yield "data: loading\n\n"
                sent_loading = True

            # 하트비트
            yield ": heartbeat\n\n"

        except Exception as exc:
            logger.warning("Preview stream error for job %s: %s", job_id, exc)

        await asyncio.sleep(2)
        idle_count += 2


def _get_latest_screenshot(db, job_id: str, after_id: str | None) -> dict | None:
    """feed_messages에서 최신 스크린샷 조회."""
    try:
        query = (
            db.table("feed_messages")
            .select("id, screenshot_base64")
            .eq("job_id", job_id)
            .not_.is_("screenshot_base64", "null")
            .order("created_at", desc=True)
            .limit(1)
        )
        result = query.execute()

        if result.data and len(result.data) > 0:
            row = result.data[0]
            if row.get("screenshot_base64") and row["id"] != after_id:
                return {
                    "id": row["id"],
                    "base64": row["screenshot_base64"],
                }
    except Exception as exc:
        logger.debug("Screenshot query failed: %s", exc)

    return None
