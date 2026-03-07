"""
Twin Track AI — Worker 실행 스크립트
각 Job을 받아 browser-use 에이전트를 실행하고 결과를 DB에 저장합니다.
"""
from __future__ import annotations
import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timezone

# 패키지 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.db.supabase import get_client
from backend.services.crypto import decrypt
from backend.services.persona_builder import build_system_prompt, DEFAULT_PERSONAS
from backend.services.agent_runner import run_persona_test
from backend.services.report_generator import generate_report
from backend.services.fix_pack import generate_fix_prompts
from backend.models.report import PersonaResult

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


async def insert_feed_message(job_id: str, message: str, level: str = "info") -> None:
    """feed_messages 테이블에 실시간 로그 INSERT."""
    try:
        db = get_client()
        db.table("feed_messages").insert(
            {
                "job_id": job_id,
                "message": message[:500],  # 최대 500자
                "level": level,
            }
        ).execute()
    except Exception as exc:
        logger.warning("Failed to insert feed message: %s", exc)


async def run_job(job_id: str) -> None:
    """단일 Job 실행."""
    db = get_client()

    # 1. Job 조회
    job_row = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job_row.data:
        logger.error("Job not found: %s", job_id)
        return

    job = job_row.data
    user_id: str = job["user_id"]
    url: str = job["url"]
    persona_ids: list[str] = job.get("persona_ids") or []

    # 2. 유저 정보 (API Key, 플랜) 조회
    profile_row = db.table("profiles").select("*").eq("id", user_id).single().execute()
    if not profile_row.data:
        logger.error("Profile not found: %s", user_id)
        return

    profile = profile_row.data
    provider: str = profile.get("llm_provider") or "openai"
    api_key_enc: str | None = profile.get("llm_api_key_enc")
    plan: str = profile.get("plan", "free")

    if not api_key_enc:
        await insert_feed_message(job_id, "API Key가 설정되지 않았습니다. 설정 화면에서 API Key를 등록해주세요.", "error")
        db.table("jobs").update({"status": "failed"}).eq("id", job_id).execute()
        return

    try:
        api_key = decrypt(api_key_enc)
    except Exception as exc:
        logger.error("Failed to decrypt API key: %s", exc)
        db.table("jobs").update({"status": "failed"}).eq("id", job_id).execute()
        return

    # 3. Job 상태 → running
    db.table("jobs").update(
        {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", job_id).execute()

    await insert_feed_message(job_id, f"테스트 대상: {url}", "info")

    # 4. 페르소나 목록 결정
    if persona_ids:
        selected_personas = [p for p in DEFAULT_PERSONAS if p["id"] in persona_ids]
    else:
        selected_personas = list(DEFAULT_PERSONAS)

    # 5. 각 페르소나 순차 실행
    all_logs: list[str] = []
    all_structured_data: list[dict] = []
    persona_results: list[PersonaResult] = []

    for idx, persona in enumerate(selected_personas):
        await insert_feed_message(
            job_id,
            f"{persona['name']} 테스트 시작 ({idx + 1}/{len(selected_personas)})",
            "info",
        )

        system_prompt = build_system_prompt(persona, url)

        result = await run_persona_test(
            url=url,
            persona=persona,
            system_prompt=system_prompt,
            api_key=api_key,
            provider=provider,
            on_log=lambda msg, level: insert_feed_message(job_id, msg, level),
        )

        persona_logs = result["logs"]
        structured_data = result["structured_data"]

        all_logs.extend(persona_logs)
        all_structured_data.append({
            "persona_name": persona["name"],
            **structured_data,
        })

        persona_results.append(
            PersonaResult(
                persona_id=persona["id"],
                persona_name=persona["name"],
                findings="\n".join(persona_logs),
                issues=[],
            )
        )

        await insert_feed_message(
            job_id, f"{persona['name']} 테스트 완료", "success"
        )

        # 마지막 스크린샷을 피드에 저장 (미리보기용)
        if structured_data.get("screenshots"):
            last_screenshot = structured_data["screenshots"][-1]
            try:
                db.table("feed_messages").insert(
                    {
                        "job_id": job_id,
                        "message": f"{persona['name']} 최종 화면",
                        "level": "info",
                        "screenshot_base64": last_screenshot[:500000],  # 500KB 제한
                    }
                ).execute()
            except Exception as exc:
                logger.debug("Screenshot feed insert failed: %s", exc)

    # 6. 리포트 생성 (LLM 호출)
    await insert_feed_message(job_id, "결과 분석 중", "info")

    try:
        report_result = await generate_report(
            url=url,
            agent_logs=all_logs,
            structured_data=all_structured_data,
            api_key=api_key,
            provider=provider,
        )
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        await insert_feed_message(job_id, f"리포트 생성 실패: {exc}", "error")
        db.table("jobs").update({"status": "failed"}).eq("id", job_id).execute()
        return

    # 7. Pro: AI Fix Pack 생성
    issues = report_result.issues
    if plan == "pro":
        await insert_feed_message(job_id, "AI Fix Pack 생성 중", "info")
        try:
            issues = await generate_fix_prompts(
                issues=issues,
                stack="React/Next.js (자동 감지)",
                api_key=api_key,
                provider=provider,
            )
        except Exception as exc:
            logger.warning("Fix Pack generation failed: %s", exc)

    # 8. Report INSERT
    report_data = {
        "job_id": job_id,
        "user_id": user_id,
        "url": url,
        "score": report_result.score,
        "summary": report_result.summary,
        "issues": [i.model_dump() for i in issues],
        "fix_pack": [i.model_dump() for i in issues if i.fix_prompt] if plan == "pro" else None,
        "persona_results": [r.model_dump() for r in persona_results],
    }

    db.table("reports").insert(report_data).execute()

    # 9. Job 상태 → done
    db.table("jobs").update(
        {"status": "done", "finished_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", job_id).execute()

    await insert_feed_message(job_id, "테스트 완료 - 리포트가 생성되었습니다", "success")
    logger.info("Job %s completed successfully", job_id)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_test.py <job_id>")
        sys.exit(1)

    job_id_arg = sys.argv[1]
    asyncio.run(run_job(job_id_arg))
