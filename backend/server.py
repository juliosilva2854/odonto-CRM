"""ASGI entrypoint shim.

Supervisor launches the backend with ``uvicorn server:app`` (read-only config),
while the actual FastAPI application lives in ``src/main.py``. This module simply
re-exports ``app`` so both the supervisor-managed process (port 8001) and the
test/integration tooling can import a single, consistent application object.
"""
from src.main import app  # noqa: F401

__all__ = ["app"]
