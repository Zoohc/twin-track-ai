from __future__ import annotations
import asyncio
import subprocess
import sys
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query

from backend.db.supabase import get_client, encode_cursor, decode_cursor
from backend.models.job import Job, JobCreate, JobCreateResponse, PaginatedJobs

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return x_user_id


@router.post("", response_model=JobCreateResponse)
async def create_job(
    body: JobCreate,
    x_user_id: Optional[str] = Header(default=None),
) -> JobCreateResponse:
    user_id = _require_user(x_user_id)
    db = get_client()

    # 기본 페르소나 (빈 배열이면 전체)
    persona_ids = [str(p) for p in body.persona_ids]

    # Job DB 생성
    result = (
        db.table("jobs")
        .insert(
            {
                "user_id": user_id,
                "url": body.url,
                "status": "queued",
                "persona_ids": persona_ids,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Job 생성 실패")

    job_id: str = result.data[0]["id"]

    # Worker를 백그라운드 서브프로세스로 실행 (비동기)
    asyncio.create_task(_dispatch_worker(job_id))

    return JobCreateResponse(
        job_id=uuid.UUID(job_id),
        status="queued",
        estimated_minutes=2,
    )


async def _dispatch_worker(job_id: str) -> None:
    """Worker 프로세스를 비동기로 실행합니다."""
    try:
        worker_path = str(__file__).replace("routers/jobs.py", "worker/run_test.py")
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            worker_path,
            job_id,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("Worker failed for job %s: %s", job_id, stderr.decode())
    except Exception as exc:
        logger.error("Failed to dispatch worker for job %s: %s", job_id, exc)


@router.get("", response_model=PaginatedJobs)
async def list_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    after: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> PaginatedJobs:
    user_id = _require_user(x_user_id)
    db = get_client()

    query = (
        db.table("jobs")
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

    return PaginatedJobs(
        items=[Job(**r) for r in items],
        next_cursor=next_cursor,
        has_next=has_next,
    )


@router.get("/{job_id}", response_model=Job)
async def get_job(
    job_id: uuid.UUID,
    x_user_id: Optional[str] = Header(default=None),
) -> Job:
    user_id = _require_user(x_user_id)
    db = get_client()

    result = (
        db.table("jobs")
        .select("*")
        .eq("id", str(job_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Job을 찾을 수 없습니다")

    return Job(**result.data)


@router.delete("/{job_id}", status_code=204)
async def cancel_job(
    job_id: uuid.UUID,
    x_user_id: Optional[str] = Header(default=None),
) -> None:
    user_id = _require_user(x_user_id)
    db = get_client()

    result = (
        db.table("jobs")
        .update({"status": "failed"})
        .eq("id", str(job_id))
        .eq("user_id", user_id)
        .in_("status", ["queued", "running"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="취소할 수 있는 Job이 없습니다")


@router.get("/{job_id}/feed")
async def get_feed_messages(
    job_id: uuid.UUID,
    x_user_id: Optional[str] = Header(default=None),
) -> list[dict[str, object]]:
    _require_user(x_user_id)
    db = get_client()

    result = (
        db.table("feed_messages")
        .select("*")
        .eq("job_id", str(job_id))
        .order("created_at", desc=False)
        .execute()
    )

    return result.data or []
