"""Pydantic schemas for patients + consents."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.modules.patients.enums import ConsentScope, Gender
from src.modules.patients.validators import format_phone_e164_br, validate_cpf

CPFStr = Annotated[str, Field(min_length=11, max_length=14, description="CPF (com ou sem formatação)")]
PhoneStr = Annotated[str, Field(min_length=8, max_length=20, description="Telefone E.164 ou nacional")]


# ── Reusable validators (module-level helpers) ──────────────


def _cpf_or_none(v: Any) -> str | None:
    if v is None or v == "":
        return None
    return validate_cpf(v)


def _phone_or_none(v: Any) -> str | None:
    if v is None or v == "":
        return None
    return format_phone_e164_br(v)


def _uf_or_none(v: Any) -> str | None:
    if v is None or v == "":
        return None
    s = str(v).strip().upper()
    if len(s) != 2 or not s.isalpha():
        raise ValueError("address_state must be a 2-letter UF code")
    return s


# ── Patient ─────────────────────────────────────────────────


class PatientCreateIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    social_name: str | None = Field(default=None, max_length=200)
    cpf: CPFStr | None = None
    rg: str | None = Field(default=None, max_length=20)
    birth_date: datetime | None = None
    gender: Gender = Gender.NOT_INFORMED
    phone_e164: PhoneStr
    secondary_phone_e164: PhoneStr | None = None
    email: EmailStr | None = None
    address_street: str | None = Field(default=None, max_length=200)
    address_number: str | None = Field(default=None, max_length=20)
    address_complement: str | None = Field(default=None, max_length=80)
    address_neighborhood: str | None = Field(default=None, max_length=120)
    address_city: str | None = Field(default=None, max_length=120)
    address_state: str | None = Field(default=None, max_length=2)
    address_zipcode: str | None = Field(default=None, max_length=10)
    is_minor: bool = False
    guardian_name: str | None = Field(default=None, max_length=200)
    guardian_cpf: CPFStr | None = None
    guardian_phone_e164: PhoneStr | None = None
    notes: str | None = None

    @field_validator("cpf", "guardian_cpf", mode="before")
    @classmethod
    def _v_cpf(cls, v: Any) -> str | None:
        return _cpf_or_none(v)

    @field_validator("phone_e164", "secondary_phone_e164", "guardian_phone_e164", mode="before")
    @classmethod
    def _v_phone(cls, v: Any) -> str | None:
        return _phone_or_none(v)

    @field_validator("address_state", mode="before")
    @classmethod
    def _v_state(cls, v: Any) -> str | None:
        return _uf_or_none(v)


class PatientUpdateIn(BaseModel):
    """Partial update — all fields optional."""

    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    social_name: str | None = None
    cpf: CPFStr | None = None
    rg: str | None = None
    birth_date: datetime | None = None
    gender: Gender | None = None
    phone_e164: PhoneStr | None = None
    secondary_phone_e164: PhoneStr | None = None
    email: EmailStr | None = None
    address_street: str | None = None
    address_number: str | None = None
    address_complement: str | None = None
    address_neighborhood: str | None = None
    address_city: str | None = None
    address_state: str | None = None
    address_zipcode: str | None = None
    is_minor: bool | None = None
    guardian_name: str | None = None
    guardian_cpf: CPFStr | None = None
    guardian_phone_e164: PhoneStr | None = None
    notes: str | None = None

    @field_validator("cpf", "guardian_cpf", mode="before")
    @classmethod
    def _v_cpf(cls, v: Any) -> str | None:
        return _cpf_or_none(v)

    @field_validator("phone_e164", "secondary_phone_e164", "guardian_phone_e164", mode="before")
    @classmethod
    def _v_phone(cls, v: Any) -> str | None:
        return _phone_or_none(v)

    @field_validator("address_state", mode="before")
    @classmethod
    def _v_state(cls, v: Any) -> str | None:
        return _uf_or_none(v)


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    full_name: str
    social_name: str | None
    cpf: str | None
    rg: str | None
    birth_date: datetime | None
    gender: Gender
    phone_e164: str
    secondary_phone_e164: str | None
    email: EmailStr | None
    address_street: str | None
    address_number: str | None
    address_complement: str | None
    address_neighborhood: str | None
    address_city: str | None
    address_state: str | None
    address_zipcode: str | None
    is_minor: bool
    guardian_name: str | None
    guardian_cpf: str | None
    guardian_phone_e164: str | None
    notes: str | None
    anonymized_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PatientSummary(BaseModel):
    """Lightweight summary for list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    cpf: str | None
    phone_e164: str
    email: EmailStr | None
    is_minor: bool
    anonymized_at: datetime | None
    created_at: datetime


class AnonymizeIn(BaseModel):
    reason: str = Field(min_length=5, max_length=500, description="Motivo do pedido de esquecimento (LGPD)")
    confirmation: bool = Field(description="O usuário deve marcar true para confirmar a ação irreversível")

    @field_validator("confirmation")
    @classmethod
    def _must_confirm(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Anonymization requires explicit confirmation")
        return v


# ── Consents ────────────────────────────────────────────────


class ConsentCreateIn(BaseModel):
    scope: ConsentScope
    granted: bool
    document_version: str = Field(min_length=1, max_length=20)
    document_text_sha256: str | None = Field(default=None, min_length=64, max_length=64)
    granted_via: str = Field(default="in_person", max_length=30)


class ConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    scope: ConsentScope
    granted: bool
    document_version: str
    granted_via: str
    actor_user_id: uuid.UUID | None
    created_at: datetime


class ConsentCurrentStateOut(BaseModel):
    """Current state for one scope (latest record)."""

    scope: ConsentScope
    granted: bool
    document_version: str
    last_changed_at: datetime
