"""Clinical record Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.modules.clinical.records.enums import ClinicalRecordType


class AttachmentIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=2048)
    mime: str | None = Field(default=None, max_length=120)
    size_bytes: int | None = Field(default=None, ge=0)
    sha256: str | None = Field(default=None, min_length=64, max_length=64)


class ClinicalRecordCreateIn(BaseModel):
    appointment_id: uuid.UUID | None = None
    record_type: ClinicalRecordType = ClinicalRecordType.EVOLUTION
    title: str = Field(min_length=2, max_length=180)
    content: str = Field(min_length=1, max_length=20000)
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=20)


class ClinicalRecordUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    content: str | None = Field(default=None, min_length=1, max_length=20000)
    attachments: list[AttachmentIn] | None = Field(default=None, max_length=20)


class ClinicalRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    appointment_id: uuid.UUID | None
    author_user_id: uuid.UUID
    record_type: ClinicalRecordType
    title: str
    content: str
    attachments: list[dict[str, Any]]
    locked_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Computed for the UI — populated by the service.
    is_locked: bool = False
    locks_at: datetime | None = None


class ClinicalRecordAddendumCreateIn(BaseModel):
    content: str = Field(min_length=1, max_length=20000)
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=20)


class ClinicalRecordAddendumOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    record_id: uuid.UUID
    author_user_id: uuid.UUID
    content: str
    attachments: list[dict[str, Any]]
    created_at: datetime
