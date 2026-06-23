"""Brazilian CPF validation. Strict digit verification + format normalization."""
from __future__ import annotations

import re

_CPF_DIGITS_RE = re.compile(r"\D")


def normalize_cpf(value: str) -> str:
    """Strip non-digits. Returns 11-digit string or raises ValueError."""
    digits = _CPF_DIGITS_RE.sub("", value)
    if len(digits) != 11:
        raise ValueError("CPF must contain 11 digits")
    if len(set(digits)) == 1:
        # Sequences like 111.111.111-11 are syntactically valid but rejected by the algorithm.
        raise ValueError("CPF cannot be a repeating sequence")
    return digits


def _check_digit(digits: str, multiplier_start: int) -> int:
    total = sum(int(d) * (multiplier_start - i) for i, d in enumerate(digits))
    rem = (total * 10) % 11
    return 0 if rem == 10 else rem


def validate_cpf(value: str) -> str:
    """Validates the check digits. Returns the formatted CPF '000.000.000-00'."""
    digits = normalize_cpf(value)
    d1 = _check_digit(digits[:9], 10)
    d2 = _check_digit(digits[:10], 11)
    if d1 != int(digits[9]) or d2 != int(digits[10]):
        raise ValueError("Invalid CPF check digits")
    return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"


def format_phone_e164_br(phone: str) -> str:
    """Normalizes Brazilian phone to E.164. Accepts (11) 99999-9999, 11999999999, +5511999999999."""
    digits = _CPF_DIGITS_RE.sub("", phone)
    if digits.startswith("55") and len(digits) in (12, 13):
        return f"+{digits}"
    if len(digits) in (10, 11):
        return f"+55{digits}"
    raise ValueError("Invalid Brazilian phone number")
