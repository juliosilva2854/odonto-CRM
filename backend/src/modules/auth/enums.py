"""Auth domain enums (kept free of ORM imports)."""
from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DENTIST = "dentist"
    RECEPTION = "reception"
    SUPER_ADMIN = "super_admin"  # plataforma: gestão cross-tenant (sem clínica)
