"""Seed baseline — idempotent.

S0/S1: Clinic + 3 Users + 15 Feature Flags
S2:    + 3 Specialties + 3 Procedures + 2 Patients + LGPD consents
S3:    + 2 Rooms + 3 Appointments (estados variados)
"""
from __future__ import annotations

import asyncio
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from src.core.database import AsyncSessionLocal
from src.core.security import hash_password
from src.modules.agenda.enums import AppointmentStatus
from src.modules.agenda.models import Appointment, Room
from src.modules.auth.enums import UserRole
from src.modules.auth.models import Professional, User
from src.modules.clinical.catalog.enums import ProcedureCategory
from src.modules.clinical.catalog.models import Procedure, Specialty
from src.modules.patients.enums import ConsentScope, Gender
from src.modules.patients.models import Patient, PatientConsent
from src.modules.tenancy.models import Clinic, ClinicFeature

# ─────────────────────────────────────────────────────────────
#  Static seed data
# ─────────────────────────────────────────────────────────────

DEFAULT_FEATURES: dict[str, bool] = {
    "patients": True,
    "anamnesis": True,
    "agenda": True,
    "checkin": True,
    "clinical_records": True,
    "odontogram": True,
    "quotes": True,
    "contracts": True,
    "financial_core": True,
    "commission_split": True,
    "recurring_charges": True,
    "online_payment": False,
    "whatsapp": False,
    "email": False,
    "dashboard_bi": False,
}

SEED_CLINIC = {
    "legal_name": "Demo Odonto Clínica LTDA",
    "trade_name": "Demo Odonto",
    "cnpj": "00.000.000/0001-00",
    "timezone": "America/Sao_Paulo",
    "plan": "premium",
}

SEED_USERS = [
    {
        "email": "admin@demo.odonto",
        "password": "Admin@123",
        "full_name": "Administrador Demo",
        "role": UserRole.ADMIN,
    },
    {
        "email": "dentist@demo.odonto",
        "password": "Dentist@123",
        "full_name": "Dr. Demo Dentista",
        "role": UserRole.DENTIST,
        "professional": {
            "cro_number": "12345",
            "cro_state": "SP",
            "specialty": "Clínica Geral",
            "default_commission_pct": Decimal("40.00"),
            "color_hex": "#10B981",
        },
    },
    {
        "email": "reception@demo.odonto",
        "password": "Reception@123",
        "full_name": "Recepção Demo",
        "role": UserRole.RECEPTION,
    },
]

SEED_SPECIALTIES = [
    {"name": "Clínica Geral", "description": "Atendimento geral, profilaxia e dentística."},
    {"name": "Ortodontia", "description": "Aparelhos ortodônticos e correção de posicionamento."},
    {"name": "Endodontia", "description": "Tratamento endodôntico (canal) e retratamentos."},
]

SEED_PROCEDURES = [
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
        "code": "REST-RES-1F",
        "tuss_code": "85100080",
        "name": "Restauração em Resina - 1 face",
        "description": "Restauração estética em resina composta, uma face.",
        "category": ProcedureCategory.RESTORATIVE,
        "specialty_name": "Clínica Geral",
        "requires_tooth": True,
        "requires_faces": True,
        "base_price": Decimal("280.00"),
        "default_duration_min": 50,
        "default_color_hex": "#3B82F6",
        "completed_color_hex": "#10B981",
    },
    {
        "code": "CAN-MOL",
        "tuss_code": "85200111",
        "name": "Tratamento Endodôntico - Molar",
        "description": "Canal em dente molar (3-4 condutos).",
        "category": ProcedureCategory.ENDODONTIC,
        "specialty_name": "Endodontia",
        "requires_tooth": True,
        "requires_faces": False,
        "base_price": Decimal("950.00"),
        "default_duration_min": 90,
        "default_color_hex": "#8B5CF6",
        "completed_color_hex": "#10B981",
    },
]

SEED_PATIENTS = [
    {
        "full_name": "Maria Silva Souza",
        "social_name": None,
        "cpf": "529.982.247-25",  # CPF válido
        "birth_date": datetime(1985, 6, 15, tzinfo=timezone.utc),
        "gender": Gender.FEMALE,
        "phone_e164": "+5511988887777",
        "email": "maria.silva@example.com",
        "address_street": "Rua das Flores",
        "address_number": "123",
        "address_neighborhood": "Vila Mariana",
        "address_city": "São Paulo",
        "address_state": "SP",
        "address_zipcode": "04111-000",
        "is_minor": False,
        "notes": "Paciente recorrente. Prefere agendamento pela manhã.",
        "consents": [
            (ConsentScope.LGPD_DATA_PROCESSING, True),
            (ConsentScope.WHATSAPP_COMMUNICATION, True),
        ],
    },
    {
        "full_name": "Lucas Oliveira Santos",
        "social_name": None,
        "cpf": "248.438.034-80",  # CPF válido
        "birth_date": datetime(2015, 3, 22, tzinfo=timezone.utc),
        "gender": Gender.MALE,
        "phone_e164": "+5511977776666",
        "email": None,
        "address_street": "Avenida Paulista",
        "address_number": "1000",
        "address_complement": "Apto 502",
        "address_neighborhood": "Bela Vista",
        "address_city": "São Paulo",
        "address_state": "SP",
        "address_zipcode": "01310-100",
        "is_minor": True,
        "guardian_name": "Carla Oliveira Santos",
        "guardian_cpf": "390.533.447-05",  # CPF válido
        "guardian_phone_e164": "+5511966665555",
        "notes": "Odontopediatria. Mãe acompanha todas as consultas.",
        "consents": [
            (ConsentScope.LGPD_DATA_PROCESSING, True),
            (ConsentScope.WHATSAPP_COMMUNICATION, True),
            (ConsentScope.IMAGE_USE, False),
        ],
    },
]


# ─────────────────────────────────────────────────────────────
#  Idempotent seed helpers
# ─────────────────────────────────────────────────────────────


async def _get_or_create_clinic(session) -> Clinic:
    stmt = select(Clinic).where(Clinic.cnpj == SEED_CLINIC["cnpj"])
    clinic = (await session.execute(stmt)).scalar_one_or_none()
    if clinic:
        return clinic
    clinic = Clinic(**SEED_CLINIC)
    session.add(clinic)
    await session.flush()
    print(f"[seed] Created clinic: {clinic.trade_name} ({clinic.id})")
    return clinic


async def _seed_features(session, clinic: Clinic) -> None:
    stmt = select(ClinicFeature.feature_key).where(ClinicFeature.clinic_id == clinic.id)
    existing = {row[0] for row in (await session.execute(stmt)).all()}
    created = 0
    for key, enabled in DEFAULT_FEATURES.items():
        if key in existing:
            continue
        session.add(ClinicFeature(clinic_id=clinic.id, feature_key=key, enabled=enabled, config={}))
        created += 1
    if created:
        await session.flush()
        print(f"[seed] Created {created} feature flag(s)")


async def _seed_users(session, clinic: Clinic) -> dict[str, User]:
    """Returns dict by email so subsequent seeds can reference an actor."""
    by_email: dict[str, User] = {}
    for spec in SEED_USERS:
        email = spec["email"].lower()
        stmt = select(User).where(User.clinic_id == clinic.id, User.email == email)
        user = (await session.execute(stmt)).scalar_one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                clinic_id=clinic.id,
                email=email,
                password_hash=hash_password(spec["password"]),
                full_name=spec["full_name"],
                role=spec["role"],
                is_active=True,
            )
            session.add(user)
            await session.flush()
            print(f"[seed] Created user: {user.email} ({user.role.value})")

            if spec["role"] == UserRole.DENTIST and "professional" in spec:
                prof = Professional(user_id=user.id, clinic_id=clinic.id, **spec["professional"])
                session.add(prof)
                await session.flush()
                print(f"[seed] Created professional for {user.email}")
        by_email[email] = user
    return by_email


async def _seed_specialties(session, clinic: Clinic) -> dict[str, Specialty]:
    by_name: dict[str, Specialty] = {}
    for spec in SEED_SPECIALTIES:
        stmt = select(Specialty).where(
            Specialty.clinic_id == clinic.id, Specialty.name == spec["name"]
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            by_name[spec["name"]] = existing
            continue
        specialty = Specialty(clinic_id=clinic.id, **spec)
        session.add(specialty)
        await session.flush()
        print(f"[seed] Created specialty: {specialty.name}")
        by_name[spec["name"]] = specialty
    return by_name


async def _seed_procedures(session, clinic: Clinic, specialties: dict[str, Specialty]) -> None:
    for spec in SEED_PROCEDURES:
        stmt = select(Procedure).where(
            Procedure.clinic_id == clinic.id, Procedure.code == spec["code"]
        )
        if (await session.execute(stmt)).scalar_one_or_none():
            continue
        specialty = specialties.get(spec["specialty_name"])
        proc = Procedure(
            clinic_id=clinic.id,
            code=spec["code"],
            tuss_code=spec.get("tuss_code"),
            name=spec["name"],
            description=spec.get("description"),
            category=spec["category"],
            specialty_id=specialty.id if specialty else None,
            requires_tooth=spec.get("requires_tooth", True),
            requires_faces=spec.get("requires_faces", False),
            default_color_hex=spec.get("default_color_hex", "#3B82F6"),
            completed_color_hex=spec.get("completed_color_hex", "#10B981"),
            base_price=spec["base_price"],
            default_duration_min=spec.get("default_duration_min", 30),
            is_active=True,
        )
        session.add(proc)
        await session.flush()
        print(f"[seed] Created procedure: {proc.code} - {proc.name}")


async def _seed_patients(session, clinic: Clinic, users: dict[str, User]) -> None:
    admin = users["admin@demo.odonto"]
    for spec in SEED_PATIENTS:
        stmt = select(Patient).where(
            Patient.clinic_id == clinic.id, Patient.cpf == spec["cpf"]
        )
        if (await session.execute(stmt)).scalar_one_or_none():
            continue

        consents_data = spec.pop("consents", [])
        patient = Patient(clinic_id=clinic.id, **spec)
        session.add(patient)
        await session.flush()
        print(f"[seed] Created patient: {patient.full_name} ({patient.cpf})")

        for scope, granted in consents_data:
            session.add(
                PatientConsent(
                    clinic_id=clinic.id,
                    patient_id=patient.id,
                    scope=scope,
                    granted=granted,
                    document_version="lgpd-v1.0",
                    granted_via="in_person",
                    actor_user_id=admin.id,
                )
            )
        if consents_data:
            await session.flush()
            print(f"[seed]   + {len(consents_data)} consent(s) for {patient.full_name}")


# ─────────────────────────────────────────────────────────────
#  S3 — Rooms + Appointments
# ─────────────────────────────────────────────────────────────


SEED_ROOMS = [
    {
        "name": "Sala 1 - Clínica Geral",
        "description": "Sala equipada para atendimentos gerais e dentística.",
        "color_hex": "#3B82F6",
        "equipments": {"cadeira": "Gnatus G6", "raio_x_intraoral": True},
    },
    {
        "name": "Sala 2 - Cirurgia / Endo",
        "description": "Sala cirúrgica com equipamentos para endodontia.",
        "color_hex": "#F97316",
        "equipments": {"cadeira": "Dabi Atlante", "microscopio": True, "negatoscopio": True},
    },
]


async def _seed_rooms(session, clinic: Clinic) -> dict[str, Room]:
    by_name: dict[str, Room] = {}
    for spec in SEED_ROOMS:
        stmt = select(Room).where(Room.clinic_id == clinic.id, Room.name == spec["name"])
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            by_name[spec["name"]] = existing
            continue
        room = Room(clinic_id=clinic.id, **spec)
        session.add(room)
        await session.flush()
        print(f"[seed] Created room: {room.name}")
        by_name[spec["name"]] = room
    return by_name


async def _seed_appointments(
    session,
    clinic: Clinic,
    users: dict[str, User],
    rooms: dict[str, Room],
) -> None:
    # Idempotência: se já existem appointments dessa clínica, pula.
    existing = (await session.execute(
        select(Appointment.id).where(Appointment.clinic_id == clinic.id).limit(1)
    )).first()
    if existing:
        return

    dentist_user = users["dentist@demo.odonto"]
    admin = users["admin@demo.odonto"]

    # Professional do dentist
    prof = (await session.execute(
        select(Professional).where(Professional.user_id == dentist_user.id)
    )).scalar_one()

    # Pacientes seedados
    patients_rows = (await session.execute(
        select(Patient).where(Patient.clinic_id == clinic.id).order_by(Patient.full_name).limit(2)
    )).scalars().all()
    if len(patients_rows) < 2:
        print("[seed] Skipping appointments — need >= 2 patients.")
        return

    sala_1 = rooms["Sala 1 - Clínica Geral"]
    sala_2 = rooms["Sala 2 - Cirurgia / Endo"]

    today = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    seed_specs = [
        # 1) HOJE 14:00 - SCHEDULED (Maria, Sala 1)
        {
            "patient": patients_rows[0],
            "room": sala_1,
            "starts_at": today,
            "ends_at": today + timedelta(minutes=40),
            "status": AppointmentStatus.SCHEDULED,
            "procedure_hint": "Profilaxia (Limpeza)",
            "notes": "Primeira consulta do mês.",
        },
        # 2) HOJE 15:00 - CONFIRMED (Lucas, Sala 1)
        {
            "patient": patients_rows[1],
            "room": sala_1,
            "starts_at": today + timedelta(hours=1),
            "ends_at": today + timedelta(hours=1, minutes=50),
            "status": AppointmentStatus.CONFIRMED,
            "procedure_hint": "Restauração 1 face (dente 16)",
            "notes": "Confirmado via WhatsApp.",
        },
        # 3) AMANHÃ 09:00 - SCHEDULED (Maria, Sala 2 - Endo)
        {
            "patient": patients_rows[0],
            "room": sala_2,
            "starts_at": tomorrow.replace(hour=9),
            "ends_at": tomorrow.replace(hour=10, minute=30),
            "status": AppointmentStatus.SCHEDULED,
            "procedure_hint": "Avaliação canal molar",
            "notes": "Encaminhada para endodontia.",
        },
    ]

    for s in seed_specs:
        appointment = Appointment(
            clinic_id=clinic.id,
            patient_id=s["patient"].id,
            professional_id=prof.id,
            room_id=s["room"].id,
            starts_at=s["starts_at"],
            ends_at=s["ends_at"],
            status=s["status"],
            procedure_hint=s["procedure_hint"],
            notes=s["notes"],
            pin_code=f"{secrets.randbelow(10000):04d}",
            qr_token=secrets.token_urlsafe(32)[:64],
            confirmed_at=(
                datetime.now(timezone.utc)
                if s["status"] == AppointmentStatus.CONFIRMED
                else None
            ),
            created_by_user_id=admin.id,
        )
        session.add(appointment)
        await session.flush()
        print(
            f"[seed] Created appointment: {s['patient'].full_name} | {s['room'].name} | "
            f"{s['starts_at'].strftime('%Y-%m-%d %H:%M')} | {s['status'].value} | PIN={appointment.pin_code}"
        )


# ─────────────────────────────────────────────────────────────


async def run_seed() -> None:
    async with AsyncSessionLocal() as session:
        try:
            clinic = await _get_or_create_clinic(session)
            await _seed_features(session, clinic)
            users = await _seed_users(session, clinic)
            specialties = await _seed_specialties(session, clinic)
            await _seed_procedures(session, clinic, specialties)
            await _seed_patients(session, clinic, users)
            rooms = await _seed_rooms(session, clinic)
            await _seed_appointments(session, clinic, users, rooms)
            await session.commit()
            print("[seed] Done.")
        except Exception:
            await session.rollback()
            raise


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
