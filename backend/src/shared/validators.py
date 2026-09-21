"""Brazilian CNPJ validation. Strict digit verification + format normalization."""
from __future__ import annotations

import re
from collections.abc import Sequence

_CNPJ_DIGITS_RE = re.compile(r"\D")

# Official weights (Receita Federal). Second pass prepends weight 6 for the first check digit.
_CNPJ_WEIGHTS_FIRST: tuple[int, ...] = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_CNPJ_WEIGHTS_SECOND: tuple[int, ...] = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def normalize_cnpj(value: str) -> str:
    """Strip non-digits. Returns 14-digit string or raises ValueError."""
    digits = _CNPJ_DIGITS_RE.sub("", value)
    if len(digits) != 14:
        raise ValueError("CNPJ must contain 14 digits")
    if len(set(digits)) == 1:
        # Sequences like 00.000.000/0000-00 are syntactically valid but rejected by the algorithm.
        raise ValueError("CNPJ cannot be a repeating sequence")
    return digits


def _check_digit(digits: str, weights: Sequence[int]) -> int:
    total = sum(int(d) * w for d, w in zip(digits, weights, strict=True))
    rem = total % 11
    return 0 if rem < 2 else 11 - rem


def validate_cnpj(value: str) -> str:
    """Validates the check digits. Returns the formatted CNPJ '00.000.000/0001-00'."""
    digits = normalize_cnpj(value)
    d1 = _check_digit(digits[:12], _CNPJ_WEIGHTS_FIRST)
    d2 = _check_digit(digits[:13], _CNPJ_WEIGHTS_SECOND)
    if d1 != int(digits[12]) or d2 != int(digits[13]):
        raise ValueError("Invalid CNPJ check digits")
    return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"
