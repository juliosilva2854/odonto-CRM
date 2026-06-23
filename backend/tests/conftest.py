"""pytest config: spin up the running FastAPI app against an existing Postgres."""
from __future__ import annotations

import os

import httpx
import pytest

# Defaults match the dev compose / preview env. Override via env vars in CI.
API_URL = os.getenv("DENTAL_API_URL", "http://127.0.0.1:8765")
ADMIN_EMAIL = os.getenv("DENTAL_ADMIN_EMAIL", "admin@demo.odonto")
ADMIN_PASSWORD = os.getenv("DENTAL_ADMIN_PASSWORD", "Admin@123")
DENTIST_EMAIL = os.getenv("DENTAL_DENTIST_EMAIL", "dentist@demo.odonto")
DENTIST_PASSWORD = os.getenv("DENTAL_DENTIST_PASSWORD", "Dentist@123")


@pytest.fixture(scope="session")
def api_url() -> str:
    return API_URL


@pytest.fixture(scope="session")
def http_client(api_url: str) -> httpx.Client:
    return httpx.Client(base_url=api_url, timeout=10.0)


def _login(client: httpx.Client, email: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(http_client: httpx.Client) -> str:
    return _login(http_client, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def dentist_token(http_client: httpx.Client) -> str:
    return _login(http_client, DENTIST_EMAIL, DENTIST_PASSWORD)


@pytest.fixture(scope="session")
def patient_id(http_client: httpx.Client, dentist_token: str) -> str:
    r = http_client.get(
        "/api/patients",
        headers={"Authorization": f"Bearer {dentist_token}"},
        params={"page": 1, "page_size": 1},
    )
    r.raise_for_status()
    items = r.json()["items"]
    assert items, "Seed data missing — run scripts.seed_baseline first"
    return items[0]["id"]


@pytest.fixture(scope="session")
def procedure_id(http_client: httpx.Client, dentist_token: str) -> str:
    """Return any active catalog procedure (preferring REST-RES-1F)."""
    r = http_client.get(
        "/api/procedures",
        headers={"Authorization": f"Bearer {dentist_token}"},
        params={"page": 1, "page_size": 20},
    )
    r.raise_for_status()
    items = r.json()["items"]
    for p in items:
        if p["code"].startswith("REST"):
            return p["id"]
    return items[0]["id"]
