"""Pure unit tests — CNPJ validator (no DB / no HTTP)."""
from __future__ import annotations

import pytest

from src.shared.validators import normalize_cnpj, validate_cnpj

# Real, publicly known CNPJs (check digits verified against the official algorithm).
VALID_CNPJS = [
    ("11.222.333/0001-81", "11.222.333/0001-81"),
    ("00.000.000/0001-91", "00.000.000/0001-91"),  # Banco do Brasil
    ("33.000.167/0001-01", "33.000.167/0001-01"),  # Petrobras
    ("60.701.190/0001-04", "60.701.190/0001-04"),  # Itaú Unibanco
    ("27.865.757/0001-02", "27.865.757/0001-02"),  # Globo
]

INVALID_CNPJS = [
    "11.222.333/0001-82",  # wrong second check digit
    "11.222.333/0001-71",  # wrong first check digit
    "11.222.333/0001",  # too short (12 digits)
    "11.222.333/0001-811",  # too long (15 digits)
    "00.000.000/0000-00",  # repeating sequence
]


@pytest.mark.parametrize(("raw", "expected"), VALID_CNPJS)
def test_validate_cnpj_accepts_valid(raw: str, expected: str) -> None:
    assert validate_cnpj(raw) == expected


@pytest.mark.parametrize("raw", INVALID_CNPJS)
def test_validate_cnpj_rejects_invalid(raw: str) -> None:
    with pytest.raises(ValueError):
        validate_cnpj(raw)


def test_normalize_cnpj_strips_mask() -> None:
    assert normalize_cnpj("11.222.333/0001-81") == "11222333000181"
    assert normalize_cnpj("11222333000181") == "11222333000181"
    assert normalize_cnpj(" 11 222 333 / 0001 - 81 ") == "11222333000181"


def test_validate_cnpj_formats_unmasked_input() -> None:
    assert validate_cnpj("11222333000181") == "11.222.333/0001-81"


def test_normalize_cnpj_rejects_repeating_sequence() -> None:
    with pytest.raises(ValueError, match="repeating"):
        normalize_cnpj("11111111111111")


def test_normalize_cnpj_rejects_wrong_length() -> None:
    with pytest.raises(ValueError, match="14 digits"):
        normalize_cnpj("123")
