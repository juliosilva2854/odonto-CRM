"""Patient-related enums."""
from __future__ import annotations

import enum


class ConsentScope(str, enum.Enum):
    LGPD_DATA_PROCESSING = "lgpd_data_processing"
    WHATSAPP_COMMUNICATION = "whatsapp_communication"
    MARKETING_CONTACT = "marketing_contact"
    IMAGE_USE = "image_use"
    TELE_DENTISTRY = "tele_dentistry"
    TREATMENT_CONTRACT = "treatment_contract"
    ANAMNESIS_SIGNATURE = "anamnesis_signature"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    NOT_INFORMED = "not_informed"
