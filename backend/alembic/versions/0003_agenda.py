"""S3: Agenda — Rooms + Appointments (tri-resource EXCLUDE) + CheckIn.

Revision ID: 0003_agenda
Revises: 0002_patients_catalog_audit
Create Date: 2026-01-15 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_agenda"
down_revision: str | None = "0002_patients_catalog_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Enums
    postgresql.ENUM(
        "scheduled",
        "confirmed",
        "waiting_room",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        name="appointmentstatus",
    ).create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(
        "qr_code", "pin", "manual", name="checkinmethod"
    ).create(op.get_bind(), checkfirst=True)

    # ── rooms
    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "equipments",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("color_hex", sa.String(7), nullable=False, server_default="#6366F1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("clinic_id", "name", name="uq_room_clinic_name"),
    )

    # ── appointments
    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "professional_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("professionals.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "room_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rooms.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "scheduled", "confirmed", "waiting_room", "in_progress",
                "completed", "cancelled", "no_show",
                name="appointmentstatus", create_type=False,
            ),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("procedure_hint", sa.String(180), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("pin_code", sa.String(8), nullable=True),
        sa.Column("qr_token", sa.String(64), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("ends_at > starts_at", name="ck_appointment_time_range"),
        sa.UniqueConstraint("clinic_id", "qr_token", name="uq_appt_qr_token"),
    )
    op.create_index("ix_appt_clinic_starts", "appointments", ["clinic_id", "starts_at"])
    op.create_index("ix_appt_prof_starts", "appointments", ["professional_id", "starts_at"])
    op.create_index("ix_appt_room_starts", "appointments", ["room_id", "starts_at"])
    op.create_index("ix_appt_patient", "appointments", ["patient_id"])
    op.create_index("ix_appt_clinic_status", "appointments", ["clinic_id", "status"])

    # ──────────────────────────────────────────────────────
    #  THE CRITICAL CONSTRAINT — tri-resource conflict prevention
    #  Three EXCLUDE USING gist constraints. PostgreSQL guarantees no two
    #  active appointments overlap on professional, room, or patient.
    # ──────────────────────────────────────────────────────
    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlap_professional
        EXCLUDE USING gist (
            clinic_id WITH =,
            professional_id WITH =,
            tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL)
    """)
    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlap_room
        EXCLUDE USING gist (
            clinic_id WITH =,
            room_id WITH =,
            tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL)
    """)
    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlap_patient
        EXCLUDE USING gist (
            clinic_id WITH =,
            patient_id WITH =,
            tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL)
    """)

    # ── check_ins
    op.create_table(
        "check_ins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "appointment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appointments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "method",
            postgresql.ENUM(
                "qr_code", "pin", "manual", name="checkinmethod", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("code_used", sa.String(64), nullable=True),
        sa.Column(
            "performed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("actor_ip", sa.String(45), nullable=True),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_checkin_clinic_time", "check_ins", ["clinic_id", "checked_in_at"])


def downgrade() -> None:
    op.drop_index("ix_checkin_clinic_time", table_name="check_ins")
    op.drop_table("check_ins")

    op.execute("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlap_patient")
    op.execute("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlap_room")
    op.execute("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlap_professional")
    op.drop_index("ix_appt_clinic_status", table_name="appointments")
    op.drop_index("ix_appt_patient", table_name="appointments")
    op.drop_index("ix_appt_room_starts", table_name="appointments")
    op.drop_index("ix_appt_prof_starts", table_name="appointments")
    op.drop_index("ix_appt_clinic_starts", table_name="appointments")
    op.drop_table("appointments")

    op.drop_table("rooms")

    op.execute("DROP TYPE IF EXISTS checkinmethod")
    op.execute("DROP TYPE IF EXISTS appointmentstatus")
