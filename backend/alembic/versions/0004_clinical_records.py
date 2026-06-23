"""S4.1: Clinical — Odontogram (event-sourced) + ClinicalRecords (CFO lock).

Revision ID: 0004_clinical_records
Revises: 0003_agenda
Create Date: 2026-02-01 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_clinical_records"
down_revision: str | None = "0003_agenda"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# ── Enum values ────────────────────────────────────────────────
ODONTOGRAM_EVENT_TYPES = (
    "procedure_added",
    "procedure_status_changed",
    "procedure_removed",
    "note_added",
)

TOOTH_PROCEDURE_STATUSES = (
    "planned",
    "to_execute",
    "in_progress",
    "done",
    "cancelled",
)

CLINICAL_RECORD_TYPES = (
    "evolution",
    "anamnesis",
    "observation",
    "prescription",
    "exam_note",
)


def upgrade() -> None:
    bind = op.get_bind()

    # ── Enums ───────────────────────────────────────────────
    postgresql.ENUM(
        *ODONTOGRAM_EVENT_TYPES, name="odontogrameventtype"
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        *TOOTH_PROCEDURE_STATUSES, name="toothprocedurestatus"
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        *CLINICAL_RECORD_TYPES, name="clinicalrecordtype"
    ).create(bind, checkfirst=True)

    # ── tooth_procedures (projection) ───────────────────────
    op.create_table(
        "tooth_procedures",
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
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tooth_fdi", sa.String(2), nullable=True),
        sa.Column(
            "faces",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "procedure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procedures.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                *TOOTH_PROCEDURE_STATUSES,
                name="toothprocedurestatus",
                create_type=False,
            ),
            nullable=False,
            server_default="planned",
        ),
        sa.Column("price_snapshot", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("commission_pct_snapshot", sa.Numeric(5, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "planned_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_toothproc_clinic_patient", "tooth_procedures", ["clinic_id", "patient_id"]
    )
    op.create_index(
        "ix_toothproc_patient_tooth", "tooth_procedures", ["patient_id", "tooth_fdi"]
    )
    op.create_index(
        "ix_toothproc_clinic_status", "tooth_procedures", ["clinic_id", "status"]
    )
    op.create_index(
        "ix_toothproc_active",
        "tooth_procedures",
        ["clinic_id", "patient_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # ── odontogram_events (append-only) ─────────────────────
    op.create_table(
        "odontogram_events",
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
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "event_type",
            postgresql.ENUM(
                *ODONTOGRAM_EVENT_TYPES,
                name="odontogrameventtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("tooth_fdi", sa.String(2), nullable=True),
        sa.Column(
            "faces",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "procedure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procedures.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "tooth_procedure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tooth_procedures.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_odontoevt_clinic_patient_time",
        "odontogram_events",
        ["clinic_id", "patient_id", "created_at"],
    )
    op.create_index(
        "ix_odontoevt_tooth_procedure",
        "odontogram_events",
        ["tooth_procedure_id"],
    )
    op.create_index(
        "ix_odontoevt_type", "odontogram_events", ["clinic_id", "event_type"]
    )

    # ── clinical_records ────────────────────────────────────
    op.create_table(
        "clinical_records",
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
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "appointment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appointments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "record_type",
            postgresql.ENUM(
                *CLINICAL_RECORD_TYPES,
                name="clinicalrecordtype",
                create_type=False,
            ),
            nullable=False,
            server_default="evolution",
        ),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "attachments",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_clrec_clinic_patient_time",
        "clinical_records",
        ["clinic_id", "patient_id", "created_at"],
    )
    op.create_index(
        "ix_clrec_author", "clinical_records", ["clinic_id", "author_user_id"]
    )
    op.create_index(
        "ix_clrec_appointment", "clinical_records", ["appointment_id"]
    )

    # ── clinical_record_addendums (append-only) ─────────────
    op.create_table(
        "clinical_record_addendums",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinical_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "attachments",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_clrec_add_record_time",
        "clinical_record_addendums",
        ["record_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_clrec_add_record_time", table_name="clinical_record_addendums")
    op.drop_table("clinical_record_addendums")

    op.drop_index("ix_clrec_appointment", table_name="clinical_records")
    op.drop_index("ix_clrec_author", table_name="clinical_records")
    op.drop_index("ix_clrec_clinic_patient_time", table_name="clinical_records")
    op.drop_table("clinical_records")

    op.drop_index("ix_odontoevt_type", table_name="odontogram_events")
    op.drop_index("ix_odontoevt_tooth_procedure", table_name="odontogram_events")
    op.drop_index("ix_odontoevt_clinic_patient_time", table_name="odontogram_events")
    op.drop_table("odontogram_events")

    op.drop_index("ix_toothproc_active", table_name="tooth_procedures")
    op.drop_index("ix_toothproc_clinic_status", table_name="tooth_procedures")
    op.drop_index("ix_toothproc_patient_tooth", table_name="tooth_procedures")
    op.drop_index("ix_toothproc_clinic_patient", table_name="tooth_procedures")
    op.drop_table("tooth_procedures")

    op.execute("DROP TYPE IF EXISTS clinicalrecordtype")
    op.execute("DROP TYPE IF EXISTS odontogrameventtype")
    op.execute("DROP TYPE IF EXISTS toothprocedurestatus")
