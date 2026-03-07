from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal
import uuid

IssueSeverity = Literal["critical", "warning", "ok"]


class Issue(BaseModel):
    id: str
    severity: IssueSeverity
    title: str
    description: str
    affected_persona: str
    screenshot_url: Optional[str] = None
    fix_prompt: Optional[str] = None
    reproduction_steps: Optional[list[str]] = None
    screenshot_urls: Optional[list[str]] = None
    element_info: Optional[str] = None


class PersonaResult(BaseModel):
    persona_id: str
    persona_name: str
    findings: str
    issues: list[Issue]


class Report(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    user_id: uuid.UUID
    url: str
    score: Optional[int] = None
    summary: Optional[str] = None
    issues: list[Issue]
    fix_pack: Optional[list[Issue]] = None
    video_url: Optional[str] = None
    persona_results: list[PersonaResult]
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedReports(BaseModel):
    items: list[Report]
    next_cursor: Optional[str] = None
    has_next: bool


class ReportGenerationResult(BaseModel):
    score: int
    summary: str
    issues: list[Issue]
