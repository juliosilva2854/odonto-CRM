"""Template padrão do questionário de anamnese."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

TEMPLATE_DEFAULT: dict[str, Any] = {
    "alergias": {
        "type": "checkbox",
        "options": ["dipirona", "penicilina", "anestésicos", "látex", "outros"],
        "value": [],
    },
    "medicamentos_uso": {"type": "text", "value": ""},
    "doencas_preexistentes": {
        "type": "checkbox",
        "options": [
            "diabetes",
            "hipertensão",
            "cardíaca",
            "coagulação",
            "renal",
            "hepática",
            "respiratória",
            "outras",
        ],
        "value": [],
    },
    "cirurgias_anteriores": {"type": "text", "value": ""},
    "gestante": {"type": "checkbox", "value": False},
    "fumante": {"type": "checkbox", "value": False},
    "observacoes": {"type": "text", "value": ""},
}


def default_template() -> dict[str, Any]:
    """Cópia profunda do template (nunca compartilhar referência mutável)."""
    return deepcopy(TEMPLATE_DEFAULT)
