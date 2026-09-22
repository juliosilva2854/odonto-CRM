#!/usr/bin/env python3
"""
Comprehensive backend test for SEQ 5 (Prompt #5) - Password reset + Users CRUD
Tests all requirements from the review request.
"""
import asyncio
import hashlib
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

import httpx

# Load environment from backend/.env
sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

BASE_URL = "http://127.0.0.1:8765"

# Seed credentials
ADMIN_EMAIL = "admin@demo.odonto"
ADMIN_PASSWORD = "Admin@123"
DENTIST_EMAIL = "dentist@demo.odonto"
DENTIST_PASSWORD = "Dentist@123"
RECEPTION_EMAIL = "reception@demo.odonto"
RECEPTION_PASSWORD = "Reception@123"

# Test passwords
OLD_PASSWORD = "OldPass123"
NEW_PASSWORD = "NewPass456"

# CNPJ generation helpers
_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _new_email(tag: str) -> str:
    return f"{tag}-{uuid.uuid4().hex[:8]}@odonto-test.com.br"


def signup_clinic(client: httpx.Client) -> tuple[str, str]:
    """Create a fresh clinic+admin. Returns (access_token, admin_email)."""
    uid = uuid.uuid4().hex[:8]
    email = f"admin-{uid}@odonto-test.com.br"
    r = client.post(
        f"{BASE_URL}/api/public/signup",
        json={
            "clinic_legal_name": f"Test Clinic {uid} LTDA",
            "clinic_trade_name": f"Test {uid}",
            "clinic_cnpj": _random_cnpj(),
            "admin_full_name": "Test Admin",
            "admin_email": email,
            "admin_password": OLD_PASSWORD,
            "plan": "pro",
        },
    )
    assert r.status_code == 201, f"Signup failed: {r.text}"
    return r.json()["access_token"], email


async def _reset_pool() -> None:
    """Reset the database connection pool."""
    from src.core.database import engine
    await engine.dispose(close=False)


async def forgot_password_with_mock(email: str) -> tuple[httpx.Response, AsyncMock]:
    """Call forgot-password in-process with mocked email_client."""
    from src.main import app
    
    await _reset_pool()
    with patch("src.core.email_client.send_password_reset_email", new=AsyncMock()) as mock:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
            r = await c.post("/api/auth/forgot-password", json={"email": email})
    return r, mock


async def reset_password(token: str, new_password: str) -> httpx.Response:
    """Call reset-password in-process."""
    from src.main import app
    
    await _reset_pool()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
        return await c.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": new_password},
        )


async def invite_user(
    token: str, email: str, full_name: str, role: str
) -> tuple[httpx.Response, AsyncMock]:
    """Call invite in-process with mocked email_client."""
    from src.main import app
    
    await _reset_pool()
    with patch("src.core.email_client.send_password_reset_email", new=AsyncMock()) as mock:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
            r = await c.post(
                "/api/users/invite",
                headers=_h(token),
                json={"email": email, "full_name": full_name, "role": role},
            )
    return r, mock


def _token_from_mock(mock: AsyncMock) -> str:
    """Extract token from mocked email call."""
    mock.assert_awaited_once()
    url = mock.await_args.kwargs["reset_url"]
    return parse_qs(urlparse(url).query)["token"][0]


async def expire_token(raw_token: str) -> None:
    """Force token expiration in the database."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool
    from src.core.config import get_settings
    
    settings = get_settings()
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    past = datetime.now(timezone.utc) - timedelta(hours=2)
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE password_reset_tokens SET expires_at = :p WHERE token_hash = :h"),
                {"p": past, "h": token_hash},
            )
    finally:
        await engine.dispose()


# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_a1_forgot_password_unknown_email():
    """(A.1) forgot-password returns 202 for unknown email (anti-enumeration)."""
    print("\n[A.1] Testing forgot-password with unknown email...")
    
    async def run():
        email = f"ghost-{uuid.uuid4().hex[:8]}@nowhere.example"
        r, mock = await forgot_password_with_mock(email)
        assert r.status_code == 202, f"Expected 202, got {r.status_code}: {r.text}"
        assert mock.await_count == 0, "Email should not be sent for unknown email"
        print("  ✓ Returns 202 for unknown email")
        print("  ✓ No email sent (anti-enumeration)")
    
    asyncio.run(run())


def test_a2_forgot_password_known_email():
    """(A.2) forgot-password returns 202 for known email and sends email."""
    print("\n[A.2] Testing forgot-password with known email...")
    
    with httpx.Client() as client:
        token, email = signup_clinic(client)
        
        async def run():
            r, mock = await forgot_password_with_mock(email)
            assert r.status_code == 202, f"Expected 202, got {r.status_code}: {r.text}"
            mock.assert_awaited_once()
            assert mock.await_args.kwargs["is_invite"] is False
            print("  ✓ Returns 202 for known email")
            print("  ✓ Email sent with is_invite=False")
        
        asyncio.run(run())


def test_a3_reset_password_success_and_login():
    """(A.3) reset with valid token works and allows login with new password."""
    print("\n[A.3] Testing reset-password success and login...")
    
    with httpx.Client() as client:
        token, email = signup_clinic(client)
        
        async def run():
            # Request reset
            _, mock = await forgot_password_with_mock(email)
            reset_token = _token_from_mock(mock)
            
            # Reset password
            r = await reset_password(reset_token, NEW_PASSWORD)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            print("  ✓ Reset password successful (200)")
            
            # Login with new password
            login = client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": email, "password": NEW_PASSWORD},
            )
            assert login.status_code == 200, f"Login failed: {login.text}"
            assert "access_token" in login.json()
            print("  ✓ Login with new password successful")
        
        asyncio.run(run())


def test_a4_old_password_rejected():
    """(A.4) old password rejected after reset."""
    print("\n[A.4] Testing old password rejected after reset...")
    
    with httpx.Client() as client:
        token, email = signup_clinic(client)
        
        async def run():
            # Request reset and change password
            _, mock = await forgot_password_with_mock(email)
            reset_token = _token_from_mock(mock)
            r = await reset_password(reset_token, NEW_PASSWORD)
            assert r.status_code == 200
            
            # Try login with old password
            login = client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": email, "password": OLD_PASSWORD},
            )
            assert login.status_code == 401, f"Expected 401, got {login.status_code}"
            print("  ✓ Old password rejected (401)")
        
        asyncio.run(run())


def test_a5_token_single_use():
    """(A.5) token is single-use (2nd use -> 400 invalid_token)."""
    print("\n[A.5] Testing token is single-use...")
    
    with httpx.Client() as client:
        token, email = signup_clinic(client)
        
        async def run():
            # Request reset
            _, mock = await forgot_password_with_mock(email)
            reset_token = _token_from_mock(mock)
            
            # First use - success
            r1 = await reset_password(reset_token, NEW_PASSWORD)
            assert r1.status_code == 200
            print("  ✓ First use successful (200)")
            
            # Second use - should fail
            r2 = await reset_password(reset_token, "AnotherPass789")
            assert r2.status_code == 400, f"Expected 400, got {r2.status_code}: {r2.text}"
            assert r2.json()["error"]["code"] == "invalid_token"
            print("  ✓ Second use rejected (400 invalid_token)")
        
        asyncio.run(run())


def test_a6_invalid_token():
    """(A.6) invalid/garbage token -> 400 invalid_token."""
    print("\n[A.6] Testing invalid token...")
    
    async def run():
        r = await reset_password("totally-invalid-token-12345", NEW_PASSWORD)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert r.json()["error"]["code"] == "invalid_token"
        print("  ✓ Invalid token rejected (400 invalid_token)")
    
    asyncio.run(run())


def test_a7_expired_token():
    """(A.7) expired token -> 400 invalid_token."""
    print("\n[A.7] Testing expired token...")
    
    with httpx.Client() as client:
        token, email = signup_clinic(client)
        
        async def run():
            # Request reset
            _, mock = await forgot_password_with_mock(email)
            reset_token = _token_from_mock(mock)
            
            # Expire the token
            await expire_token(reset_token)
            
            # Try to use expired token
            r = await reset_password(reset_token, NEW_PASSWORD)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
            assert r.json()["error"]["code"] == "invalid_token"
            print("  ✓ Expired token rejected (400 invalid_token)")
        
        asyncio.run(run())


def test_a8_weak_password():
    """(A.8) weak new_password (<8 chars) -> 422 validation_error."""
    print("\n[A.8] Testing weak password validation...")
    
    with httpx.Client() as client:
        token, email = signup_clinic(client)
        
        async def run():
            # Request reset
            _, mock = await forgot_password_with_mock(email)
            reset_token = _token_from_mock(mock)
            
            # Try to reset with weak password
            r = await reset_password(reset_token, "123")  # < 8 chars
            assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
            assert r.json()["error"]["code"] == "validation_error"
            print("  ✓ Weak password rejected (422 validation_error)")
        
        asyncio.run(run())


def test_b1_invite_requires_admin():
    """(B.1) invite requires admin (reception token -> 403 forbidden)."""
    print("\n[B.1] Testing invite requires admin...")
    
    with httpx.Client() as client:
        # Get reception token
        r = client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": RECEPTION_EMAIL, "password": RECEPTION_PASSWORD},
        )
        assert r.status_code == 200
        reception_token = r.json()["access_token"]
        
        async def run():
            email = _new_email("test")
            r, _ = await invite_user(reception_token, email, "Test User", "dentist")
            assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
            assert r.json()["error"]["code"] == "forbidden"
            print("  ✓ Reception user cannot invite (403 forbidden)")
        
        asyncio.run(run())


def test_b2_invite_creates_inactive_user():
    """(B.2) invite creates is_active=false user and triggers invite email."""
    print("\n[B.2] Testing invite creates inactive user...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        async def run():
            email = _new_email("dentist")
            r, mock = await invite_user(admin_token, email, "Dr. Invited", "dentist")
            assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
            body = r.json()
            assert body["email"] == email
            assert body["role"] == "dentist"
            assert body["is_active"] is False
            mock.assert_awaited_once()
            assert mock.await_args.kwargs["is_invite"] is True
            print("  ✓ User created with is_active=False")
            print("  ✓ Invite email sent with is_invite=True")
        
        asyncio.run(run())


def test_b3_invite_duplicate_email():
    """(B.3) duplicate email invite -> 409 conflict."""
    print("\n[B.3] Testing duplicate email invite...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        async def run():
            email = _new_email("dup")
            # First invite
            r1, _ = await invite_user(admin_token, email, "First", "reception")
            assert r1.status_code == 201
            print("  ✓ First invite successful")
            
            # Second invite with same email
            r2, _ = await invite_user(admin_token, email, "Second", "reception")
            assert r2.status_code == 409, f"Expected 409, got {r2.status_code}: {r2.text}"
            assert r2.json()["error"]["code"] == "conflict"
            print("  ✓ Duplicate email rejected (409 conflict)")
        
        asyncio.run(run())


def test_b4_invited_user_activate_and_login():
    """(B.4) invited user can activate via reset-password then login."""
    print("\n[B.4] Testing invited user activation and login...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        async def run():
            email = _new_email("activate")
            # Invite user
            r, mock = await invite_user(admin_token, email, "Activate Me", "reception")
            assert r.status_code == 201
            print("  ✓ User invited")
            
            # Extract invite token
            reset_url = mock.await_args.kwargs["reset_url"]
            invite_token = parse_qs(urlparse(reset_url).query)["token"][0]
            
            # Activate via reset-password
            rr = await reset_password(invite_token, "MyPassword123")
            assert rr.status_code == 200, f"Expected 200, got {rr.status_code}: {rr.text}"
            print("  ✓ User activated via reset-password")
            
            # Login
            login = client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": email, "password": "MyPassword123"},
            )
            assert login.status_code == 200, f"Login failed: {login.text}"
            print("  ✓ Login successful after activation")
        
        asyncio.run(run())


def test_b5_list_users_as_admin():
    """(B.5) GET /api/users lists users (admin)."""
    print("\n[B.5] Testing list users as admin...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        async def run():
            # Invite a user first
            email = _new_email("listed")
            await invite_user(admin_token, email, "Listed User", "dentist")
            
            # List users
            r = client.get(
                f"{BASE_URL}/api/users",
                headers=_h(admin_token),
                params={"page_size": 100},
            )
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            body = r.json()
            emails = {u["email"] for u in body["items"]}
            assert email in emails
            assert body["total"] >= 2  # admin + invited user
            print(f"  ✓ List users successful (total: {body['total']})")
        
        asyncio.run(run())


def test_b6_list_users_requires_admin():
    """(B.6) GET /api/users requires admin (reception -> 403)."""
    print("\n[B.6] Testing list users requires admin...")
    
    with httpx.Client() as client:
        # Get reception token
        r = client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": RECEPTION_EMAIL, "password": RECEPTION_PASSWORD},
        )
        assert r.status_code == 200
        reception_token = r.json()["access_token"]
        
        # Try to list users
        r = client.get(f"{BASE_URL}/api/users", headers=_h(reception_token))
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        print("  ✓ Reception user cannot list users (403)")


def test_b7_update_role():
    """(B.7) PUT /api/users/{id}/role changes role -> 200."""
    print("\n[B.7] Testing update user role...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        async def run():
            # Invite a user
            email = _new_email("role")
            inv, _ = await invite_user(admin_token, email, "Role Change", "reception")
            user_id = inv.json()["id"]
            print("  ✓ User invited as reception")
            
            # Change role
            r = client.put(
                f"{BASE_URL}/api/users/{user_id}/role",
                headers=_h(admin_token),
                json={"role": "dentist"},
            )
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            assert r.json()["role"] == "dentist"
            print("  ✓ Role changed to dentist (200)")
        
        asyncio.run(run())


def test_b8_cannot_demote_last_admin():
    """(B.8) cannot demote last admin -> 409 last_admin."""
    print("\n[B.8] Testing cannot demote last admin...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        # Get admin user ID
        r = client.get(f"{BASE_URL}/api/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        admin_id = r.json()["user"]["id"]
        
        # Try to demote the only admin
        r = client.put(
            f"{BASE_URL}/api/users/{admin_id}/role",
            headers=_h(admin_token),
            json={"role": "dentist"},
        )
        assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
        assert r.json()["error"]["code"] == "last_admin"
        print("  ✓ Cannot demote last admin (409 last_admin)")


def test_b9_cannot_deactivate_self():
    """(B.9) cannot deactivate self -> 422 cannot_deactivate_self."""
    print("\n[B.9] Testing cannot deactivate self...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        # Get admin user ID
        r = client.get(f"{BASE_URL}/api/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        admin_id = r.json()["user"]["id"]
        
        # Try to deactivate self
        r = client.delete(f"{BASE_URL}/api/users/{admin_id}", headers=_h(admin_token))
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
        assert r.json()["error"]["code"] == "cannot_deactivate_self"
        print("  ✓ Cannot deactivate self (422 cannot_deactivate_self)")


def test_b10_deactivate_invited_user():
    """(B.10) deactivating non-admin invited user -> 200 is_active=false."""
    print("\n[B.10] Testing deactivate invited user...")
    
    with httpx.Client() as client:
        admin_token, _ = signup_clinic(client)
        
        async def run():
            # Invite a user
            email = _new_email("deact")
            inv, _ = await invite_user(admin_token, email, "To Deactivate", "dentist")
            user_id = inv.json()["id"]
            print("  ✓ User invited")
            
            # Deactivate
            r = client.delete(f"{BASE_URL}/api/users/{user_id}", headers=_h(admin_token))
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            assert r.json()["is_active"] is False
            print("  ✓ User deactivated (200, is_active=False)")
        
        asyncio.run(run())


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 80)
    print("SEQ 5 (Prompt #5) Backend Testing - Password Reset + Users CRUD")
    print("=" * 80)
    
    # Check backend is running
    try:
        r = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        assert r.status_code == 200
        print(f"✓ Backend is running at {BASE_URL}")
    except Exception as e:
        print(f"✗ Backend is not running at {BASE_URL}: {e}")
        return 1
    
    tests = [
        # (A) Password reset
        ("A.1", test_a1_forgot_password_unknown_email),
        ("A.2", test_a2_forgot_password_known_email),
        ("A.3", test_a3_reset_password_success_and_login),
        ("A.4", test_a4_old_password_rejected),
        ("A.5", test_a5_token_single_use),
        ("A.6", test_a6_invalid_token),
        ("A.7", test_a7_expired_token),
        ("A.8", test_a8_weak_password),
        # (B) Users CRUD
        ("B.1", test_b1_invite_requires_admin),
        ("B.2", test_b2_invite_creates_inactive_user),
        ("B.3", test_b3_invite_duplicate_email),
        ("B.4", test_b4_invited_user_activate_and_login),
        ("B.5", test_b5_list_users_as_admin),
        ("B.6", test_b6_list_users_requires_admin),
        ("B.7", test_b7_update_role),
        ("B.8", test_b8_cannot_demote_last_admin),
        ("B.9", test_b9_cannot_deactivate_self),
        ("B.10", test_b10_deactivate_invited_user),
    ]
    
    passed = 0
    failed = 0
    
    for test_id, test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"  ✗ FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            failed += 1
    
    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80)
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())
