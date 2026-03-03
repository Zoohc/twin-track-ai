"""
Twin Track AI — FastAPI 백엔드 진입점
"""
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import jobs, reports, personas, preview, profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Twin Track AI backend starting...")
    yield
    logger.info("Twin Track AI backend shutting down...")


app = FastAPI(
    title="Twin Track AI API",
    version="0.1.0",
    description="AI 기반 웹 서비스 자동 테스트 플랫폼",
    lifespan=lifespan,
)

# CORS 설정
allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(jobs.router)
app.include_router(reports.router)
app.include_router(personas.router)
app.include_router(preview.router)
app.include_router(profile.router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "twin-track-ai"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
