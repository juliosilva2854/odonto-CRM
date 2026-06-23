"""S2: Patients (LGPD) + Catalog (Specialties/Procedures) + DataAccessLog.

Revision ID: 0002_patients_catalog_audit
Revises: 0001_baseline
Create Date: 2026-01-08 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_patients_catalog_audit"
down_revision: str | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ────────────────────────────────────────────────────────
    # Enums (criados com create_type=True; tabelas referenciam sem recriar)
    # ────────────────────────────────────────────────────────
    postgresql.ENUM(
        "male", "female", "other", "not_informed", name="patientgender"
    ).create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(
        "lgpd_data_processing",
        "whatsapp_communication",
        "marketing_contact",
        "image_use",
        "tele_dentistry",
        "treatment_contract",
        "anamnesis_signature",
        name="consentscope",
    ).create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(
        "diagnostic",
        "preventive",
        "restorative",
        "endodontic",
        "surgical",
        "prosthetic",
        "orthodontic",
        "periodontal",
        "aesthetic",
        "other",
        name="procedurecategory",
    ).create(op.get_bind(), checkfirst=True)

    # ────────────────────────────────────────────────────────
    # patients
    # ────────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("social_name", sa.String(200), nullable=True),
        sa.Column("cpf", sa.String(14), nullable=True),
        sa.Column("rg", sa.String(20), nullable=True),
        sa.Column("birth_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "gender",
            postgresql.ENUM(
                "male", "female", "other", "not_informed",
                name="patientgender", create_type=False,
            ),
            nullable=False,
            server_default="not_informed",
        ),
        sa.Column("phone_e164", sa.String(20), nullable=False),
        sa.Column("secondary_phone_e164", sa.String(20), nullable=True),
        sa.Column("email", sa.String(180), nullable=True),
        sa.Column("address_street", sa.String(200), nullable=True),
        sa.Column("address_number", sa.String(20), nullable=True),
        sa.Column("address_complement", sa.String(80), nullable=True),
        sa.Column("address_neighborhood", sa.String(120), nullable=True),
        sa.Column("address_city", sa.String(120), nullable=True),
        sa.Column("address_state", sa.String(2), nullable=True),
        sa.Column("address_zipcode", sa.String(10), nullable=True),
        sa.Column("is_minor", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("guardian_name", sa.String(200), nullable=True),
        sa.Column("guardian_cpf", sa.String(14), nullable=True),
        sa.Column("guardian_phone_e164", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "uq_patient_clinic_cpf",
        "patients",
        ["clinic_id", "cpf"],
        unique=True,
        postgresql_where=sa.text("cpf IS NOT NULL AND anonymized_at IS NULL"),
    )
    op.create_index("ix_patients_clinic_name", "patients", ["clinic_id", "full_name"])
    op.create_index("ix_patients_phone", "patients", ["phone_e164"])
    op.create_index(
        "ix_patients_clinic_active",
        "patients",
        ["clinic_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # ────────────────────────────────────────────────────────
    # patient_consents
    # ────────────────────────────────────────────────────────
    op.create_table(
        "patient_consents",
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
            "scope",
            postgresql.ENUM(
                "lgpd_data_processing",
                "whatsapp_communication",
                "marketing_contact",
                "image_use",
                "tele_dentistry",
                "treatment_contract",
                "anamnesis_signature",
                name="consentscope",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("document_version", sa.String(20), nullable=False),
        sa.Column("document_text_sha256", sa.String(64), nullable=True),
        sa.Column("granted_via", sa.String(30), nullable=False, server_default="in_person"),
        sa.Column("actor_ip", sa.String(45), nullable=True),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "patient_id", "scope", "created_at", name="uq_consent_unique_event"
        ),
    )
    op.create_index(
        "ix_consent_patient_scope_time",
        "patient_consents",
        ["patient_id", "scope", "created_at"],
    )

    # ────────────────────────────────────────────────────────
    # specialties
    # ────────────────────────────────────────────────────────
    op.create_table(
        "specialties",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("clinic_id", "name", name="uq_specialty_clinic_name"),
    )

    # ────────────────────────────────────────────────────────
    # procedures
    # ────────────────────────────────────────────────────────
    op.create_table(
        "procedures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("tuss_code", sa.String(20), nullable=True),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "category",
            postgresql.ENUM(
                "diagnostic", "preventive", "restorative", "endodontic", "surgical",
                "prosthetic", "orthodontic", "periodontal", "aesthetic", "other",
                name="procedurecategory", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "specialty_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("specialties.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("requires_tooth", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("requires_faces", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_color_hex", sa.String(7), nullable=False, server_default="#3B82F6"),
        sa.Column("completed_color_hex", sa.String(7), nullable=False, server_default="#10B981"),
        sa.Column("base_price", sa.Numeric(10, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("default_duration_min", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("commission_pct_override", sa.Numeric(5, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("clinic_id", "code", name="uq_procedure_clinic_code"),
    )
    op.create_index("ix_procedures_clinic_category", "procedures", ["clinic_id", "category"])
    op.create_index("ix_procedures_clinic_specialty", "procedures", ["clinic_id", "specialty_id"])
    op.create_index("ix_procedures_tuss", "procedures", ["tuss_code"])
    op.create_index(
        "ix_procedures_clinic_active",
        "procedures",
        ["clinic_id"],
        postgresql_where=sa.text("is_active = true AND deleted_at IS NULL"),
    )

    # ────────────────────────────────────────────────────────
    # data_access_logs (LGPD Art. 37)
    # ────────────────────────────────────────────────────────
    op.create_table(
        "data_access_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("resource_type", sa.String(60), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purpose", sa.String(60), nullable=False),
        sa.Column("actor_ip", sa.String(45), nullable=True),
        sa.Column("accessed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_access_patient_time", "data_access_logs", ["patient_id", "accessed_at"])
    op.create_index("ix_access_actor_time", "data_access_logs", ["actor_user_id", "accessed_at"])
    op.create_index("ix_access_clinic_time", "data_access_logs", ["clinic_id", "accessed_at"])


def downgrade() -> None:
    op.drop_index("ix_access_clinic_time", table_name="data_access_logs")
    op.drop_index("ix_access_actor_time", table_name="data_access_logs")
    op.drop_index("ix_access_patient_time", table_name="data_access_logs")
    op.drop_table("data_access_logs")

    op.drop_index("ix_procedures_clinic_active", table_name="procedures")
    op.drop_index("ix_procedures_tuss", table_name="procedures")
    op.drop_index("ix_procedures_clinic_specialty", table_name="procedures")
    op.drop_index("ix_procedures_clinic_category", table_name="procedures")
    op.drop_table("procedures")

    op.drop_table("specialties")

    op.drop_index("ix_consent_patient_scope_time", table_name="patient_consents")
    op.drop_table("patient_consents")

    op.drop_index("ix_patients_clinic_active", table_name="patients")
    op.drop_index("ix_patients_phone", table_name="patients")
    op.drop_index("ix_patients_clinic_name", table_name="patients")
    op.drop_index("uq_patient_clinic_cpf", table_name="patients")
    op.drop_table("patients")

    op.execute("DROP TYPE IF EXISTS procedurecategory")
    op.execute("DROP TYPE IF EXISTS consentscope")
    op.execute("DROP TYPE IF EXISTS patientgender")
