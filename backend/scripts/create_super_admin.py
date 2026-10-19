"""Cria (ou atualiza) um Super Admin de plataforma — idempotente.

Uso:
    cd backend && python -m scripts.create_super_admin \
        --email root@plataforma.com --password 'SenhaForte123' --full-name 'Root'

Super admins não pertencem a nenhuma clínica (clinic_id = NULL) e têm acesso
ao painel cross-tenant em /api/admin.
"""
from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import select

from src.core.database import AsyncSessionLocal
from src.core.security import hash_password
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.tenancy.models import Clinic  # noqa: F401 — registra a tabela p/ o FK


async def _run(email: str, password: str, full_name: str) -> None:
    email = email.lower().strip()
    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if existing is not None:
            existing.password_hash = hash_password(password)
            existing.full_name = full_name
            existing.role = UserRole.SUPER_ADMIN
            existing.is_super_admin = True
            existing.is_active = True
            existing.clinic_id = None
            await session.commit()
            print(f"[super-admin] Atualizado: {email}")
            return

        user = User(
            clinic_id=None,
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_super_admin=True,
        )
        session.add(user)
        await session.commit()
        print(f"[super-admin] Criado: {email}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria/atualiza um Super Admin")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--full-name", required=True, dest="full_name")
    args = parser.parse_args()
    asyncio.run(_run(args.email, args.password, args.full_name))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
