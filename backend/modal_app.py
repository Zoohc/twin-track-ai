"""
Twin Track AI — Modal 배포 설정

FastAPI ASGI 앱과 AI 테스트 워커를 Modal 서버리스로 실행합니다.

배포 명령:
  modal deploy backend/modal_app.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import modal

# ── 이미지 빌드 ────────────────────────────────────────────────────────────────
# Playwright + browser-use + FastAPI 의존성을 포함한 이미지
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "fastapi>=0.115.0",
        "uvicorn[standard]>=0.32.0",
        "pydantic>=2.9.0",
        "supabase>=2.10.0",
        "browser-use>=0.1.40",
        "playwright>=1.48.0",
        "langchain-openai>=0.3.0",
        "langchain-anthropic>=0.3.0",
        "openai>=1.55.0",
        "anthropic>=0.40.0",
        "cryptography>=43.0.0",
        "python-dotenv>=1.0.1",
        "httpx>=0.27.0",
        "asyncio-throttle>=1.0.2",
    )
    .run_commands("playwright install chromium --with-deps")
    .add_local_dir(
        local_path=Path(__file__).parent.parent,  # twin-track-ai/
        remote_path="/app",
        ignore=[".next", "__pycache__", "node_modules", ".env", ".git", ".DS_Store"],
    )
)

app = modal.App("twin-track-ai", image=image)

_secrets = [modal.Secret.from_name("twin-track-ai")]


# ── AI 테스트 워커 ──────────────────────────────────────────────────────────────
@app.function(
    secrets=_secrets,
    timeout=600,  # 최대 10분 (AI 에이전트 실행 시간 고려)
)
async def run_worker(job_id: str) -> None:
    """단일 Job의 AI 테스트 파이프라인을 실행합니다."""
    sys.path.insert(0, "/app")
    from backend.worker.run_test import run_job  # noqa: PLC0415

    await run_job(job_id)


# ── FastAPI ASGI 앱 ─────────────────────────────────────────────────────────────
@app.function(
    secrets=_secrets,
    timeout=60,
)
@modal.asgi_app()
def fastapi_app() -> object:
    """FastAPI 앱을 ASGI 모드로 노출합니다."""
    sys.path.insert(0, "/app")

    # subprocess 대신 Modal function spawn으로 워커를 백그라운드 실행
    import backend.routers.jobs as jobs_module  # noqa: PLC0415

    async def _modal_dispatch(job_id: str) -> None:
        run_worker.spawn(job_id)

    jobs_module._dispatch_worker = _modal_dispatch  # type: ignore[attr-defined]

    from backend.main import app as _fastapi  # noqa: PLC0415

    return _fastapi
