"""Default data provisioned for every new clinic at signup.

All values are starting points — the clinic can edit them later through the
regular catalog / agenda / feature-flag endpoints.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from src.modules.clinical.catalog.enums import ProcedureCategory
from src.modules.onboarding.enums import PlanTier

DEFAULT_TRIAL_DAYS = 14

# ── Feature flags per plan ──────────────────────────────────
_ESSENCIAL_FEATURES: dict[str, bool] = {
    "patients": True,
    "agenda": True,
    "checkin": True,
    "clinical_records": True,
    "odontogram": True,
    "anamnesis": True,
    "quotes": False,
    "contracts": False,
    "financial_core": False,
    "commission_split": False,
    "recurring_charges": False,
    "online_payment": False,
    "whatsapp": False,
    "email": False,
    "dashboard_bi": False,
}

_PRO_FEATURES: dict[str, bool] = {
    **_ESSENCIAL_FEATURES,
    "quotes": True,
    "whatsapp": True,
    "commission_split": True,
}

_CLINICA_FEATURES: dict[str, bool] = {
    **_PRO_FEATURES,
    "contracts": True,
    "financial_core": True,
    "recurring_charges": True,
    "dashboard_bi": True,
    "email": True,
}

PLAN_FEATURES: dict[PlanTier, dict[str, bool]] = {
    PlanTier.ESSENCIAL: _ESSENCIAL_FEATURES,
    PlanTier.PRO: _PRO_FEATURES,
    PlanTier.CLINICA: _CLINICA_FEATURES,
}

# ── Agenda ──────────────────────────────────────────────────
DEFAULT_ROOM: dict[str, Any] = {
    "name": "Consultório 1",
    "description": "Sala principal",
    "color_hex": "#6366F1",
}

# ── Catalog ─────────────────────────────────────────────────
DEFAULT_SPECIALTIES: list[dict[str, Any]] = [
    {"name": "Clínica Geral", "description": "Atendimento geral, profilaxia e dentística."},
    {"name": "Ortodontia", "description": "Aparelhos ortodônticos e correção de posicionamento."},
    {"name": "Endodontia", "description": "Tratamento endodôntico (canal) e retratamentos."},
]

# `specialty_name` must match an entry in DEFAULT_SPECIALTIES (or be None).
DEFAULT_PROCEDURES: list[dict[str, Any]] = [
    {
        "code": "PROF-01",
        "tuss_code": "81000019",
        "name": "Profilaxia (Limpeza)",
        "description": "Remoção de placa bacteriana e tártaro supragengival.",
        "category": ProcedureCategory.PREVENTIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": False,
        "requires_faces": False,
        "base_price": Decimal("150.00"),
        "default_duration_min": 40,
    },
    {
        "code": "REST-1F",
        "tuss_code": "85100080",
        "name": "Restauração em resina - 1 face",
        "description": "Restauração estética em resina composta, uma face.",
        "category": ProcedureCategory.RESTORATIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": True,
        "base_price": Decimal("280.00"),
        "default_duration_min": 50,
    },
    {
        "code": "REST-2F",
        "tuss_code": "85100099",
        "name": "Restauração em resina - 2 faces",
        "description": "Restauração estética em resina composta, duas faces.",
        "category": ProcedureCategory.RESTORATIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": True,
        "base_price": Decimal("380.00"),
        "default_duration_min": 60,
    },
    {
        "code": "REST-3F",
        "tuss_code": "85100102",
        "name": "Restauração em resina - 3 faces",
        "description": "Restauração estética em resina composta, três faces.",
        "category": ProcedureCategory.RESTORATIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": True,
        "base_price": Decimal("480.00"),
        "default_duration_min": 70,
    },
    {
        "code": "CAN-INC",
        "tuss_code": "85200090",
        "name": "Tratamento de canal - incisivo/canino",
        "description": "Tratamento endodôntico em dente unirradicular.",
        "category": ProcedureCategory.ENDODONTIC,
        "specialty_name": "Endodontia",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("700.00"),
        "default_duration_min": 80,
    },
    {
        "code": "CAN-PRE",
        "tuss_code": "85200103",
        "name": "Tratamento de canal - pré-molar",
        "description": "Tratamento endodôntico em pré-molar (1-2 condutos).",
        "category": ProcedureCategory.ENDODONTIC,
        "specialty_name": "Endodontia",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("850.00"),
        "default_duration_min": 90,
    },
    {
        "code": "CAN-MOL",
        "tuss_code": "85200111",
        "name": "Tratamento de canal - molar",
        "description": "Tratamento endodôntico em molar (3-4 condutos).",
        "category": ProcedureCategory.ENDODONTIC,
        "specialty_name": "Endodontia",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("950.00"),
        "default_duration_min": 90,
    },
    {
        "code": "EXO-SIM",
        "tuss_code": "82000845",
        "name": "Extração simples",
        "description": "Exodontia de dente permanente erupcionado.",
        "category": ProcedureCategory.SURGICAL,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("250.00"),
        "default_duration_min": 40,
    },
    {
        "code": "EXO-CIR",
        "tuss_code": "82000861",
        "name": "Extração cirúrgica",
        "description": "Exodontia com retalho / osteotomia (inclusos e semi-inclusos).",
        "category": ProcedureCategory.SURGICAL,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("450.00"),
        "default_duration_min": 60,
    },
    {
        "code": "FLUOR",
        "tuss_code": "81000051",
        "name": "Aplicação de flúor",
        "description": "Aplicação tópica de flúor.",
        "category": ProcedureCategory.PREVENTIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": False,
        "requires_faces": False,
        "base_price": Decimal("120.00"),
        "default_duration_min": 30,
    },
    {
        "code": "SELANTE",
        "tuss_code": "81000035",
        "name": "Selante",
        "description": "Aplicação de selante de fóssulas e fissuras.",
        "category": ProcedureCategory.PREVENTIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("100.00"),
        "default_duration_min": 30,
    },
    {
        "code": "COROA-MC",
        "tuss_code": "85400026",
        "name": "Coroa metalocerâmica",
        "description": "Coroa total metalocerâmica.",
        "category": ProcedureCategory.PROSTHETIC,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("1400.00"),
        "default_duration_min": 90,
    },
    {
        "code": "COROA-PORC",
        "tuss_code": "85400069",
        "name": "Coroa em porcelana",
        "description": "Coroa total em cerâmica pura.",
        "category": ProcedureCategory.PROSTHETIC,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("1800.00"),
        "default_duration_min": 90,
    },
    {
        "code": "RASPA",
        "tuss_code": "85300067",
        "name": "Raspagem periodontal",
        "description": "Raspagem e alisamento radicular (por sextante/arcada).",
        "category": ProcedureCategory.PERIODONTAL,
        "specialty_name": "Clínica Geral",
        "requires_tooth": False,
        "requires_faces": False,
        "base_price": Decimal("350.00"),
        "default_duration_min": 60,
    },
    {
        "code": "RX-PERI",
        "tuss_code": "83000030",
        "name": "Radiografia periapical",
        "description": "Radiografia intraoral periapical.",
        "category": ProcedureCategory.DIAGNOSTIC,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("60.00"),
        "default_duration_min": 15,
    },
]
