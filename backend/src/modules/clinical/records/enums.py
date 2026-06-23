"""Clinical record enums."""
from __future__ import annotations

import enum


class ClinicalRecordType(str, enum.Enum):
    EVOLUTION = "evolution"        # Evolução clínica padrão
    ANAMNESIS = "anamnesis"        # Anamnese (snapshot)
    OBSERVATION = "observation"    # Observação livre / orientação
    PRESCRIPTION = "prescription"  # Prescrição (também trava sob CFO)
    EXAM_NOTE = "exam_note"        # Laudo / interpretação de exame
