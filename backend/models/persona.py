from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid


class PersonaBase(BaseModel):
    name: str
    description: str


class PersonaCreate(PersonaBase):
    pass


class Persona(PersonaBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    system_prompt: str
    is_default: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
