from __future__ import annotations
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from typing import Optional, Literal
import uuid

JobStatus = Literal["queued", "running", "done", "failed"]


class JobCreate(BaseModel):
    url: str = Field(..., min_length=7)
    persona_ids: list[uuid.UUID] = Field(default_factory=list)
    flow_urls: list[str] = Field(default_factory=list)


class JobCreateResponse(BaseModel):
    job_id: uuid.UUID
    status: JobStatus
    estimated_minutes: int = 2


class Job(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    url: str
    status: JobStatus
    persona_ids: list[uuid.UUID]
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PaginatedJobs(BaseModel):
    items: list[Job]
    next_cursor: Optional[str] = None
    has_next: bool
