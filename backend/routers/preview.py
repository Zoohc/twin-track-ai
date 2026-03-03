from __future__ import annotations
import asyncio
import base64
import logging
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["preview"])


@router.get("/preview-stream")
async def preview_stream(
    job_id: str = Query(..., description="스트리밍할 Job ID"),
) -> StreamingResponse:
    """
    SSE endpoint: 실행 중인 Job의 Playwright 스크린샷을 ~2fps로 스트리밍.
    클라이언트는 <canvas>에 렌더링.

    실제 스크린샷은 Worker의 Playwright에서 발행하고,
    여기서는 Supabase Realtime 또는 공유 메모리를 통해 중계합니다.
    MVP: 폴링 방식으로 DB에서 가져오거나 직접 브라우저 실행 (단순화).
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
    MVP 구현: Job이 running 상태인 동안 대기 프레임 전송.
    실제 스크린샷 스트리밍은 Worker와의 채널 연동 필요 (V2).
    """
    from backend.db.supabase import get_client

    db = get_client()
    sent_placeholder = False
    max_idle_seconds = 300  # 5분 타임아웃
    idle_count = 0

    while idle_count < max_idle_seconds:
        try:
            result = (
                db.table("jobs").select("status").eq("id", job_id).single().execute()
            )
            status = result.data.get("status") if result.data else "done"

            if status in ("done", "failed"):
                yield "data: done\n\n"
                break

            # 실제 스크린샷 대신 placeholder 전송 (첫 번째만)
            if not sent_placeholder:
                placeholder_b64 = _create_placeholder_frame()
                yield f"data: {placeholder_b64}\n\n"
                sent_placeholder = True

            # 하트비트
            yield ": heartbeat\n\n"

        except Exception as exc:
            logger.warning("Preview stream error for job %s: %s", job_id, exc)

        await asyncio.sleep(1)
        idle_count += 1


def _create_placeholder_frame() -> str:
    """테스트 진행 중 표시용 placeholder JPEG을 base64로 반환."""
    # 1x1 투명 JPEG (실제로는 Playwright 스크린샷이 와야 함)
    # 최소 유효 JPEG 바이트
    minimal_jpeg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
        b"C \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f"
        b"\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00"
        b"\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01"
        b"\x00\x00?\x00\xfb\xff\xd9"
    )
    return base64.b64encode(minimal_jpeg).decode()
