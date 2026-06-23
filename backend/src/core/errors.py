"""Unified application exception + global handlers."""
from __future__ import annotations

from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base class for all domain/application errors."""

    code: str = "app_error"
    status_code: int = status.HTTP_400_BAD_REQUEST
    message: str = "An error occurred"

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        self.details = details or {}


class NotFoundError(AppException):
    code = "not_found"
    status_code = status.HTTP_404_NOT_FOUND
    message = "Resource not found"


class UnauthorizedError(AppException):
    code = "unauthorized"
    status_code = status.HTTP_401_UNAUTHORIZED
    message = "Authentication required"


class ForbiddenError(AppException):
    code = "forbidden"
    status_code = status.HTTP_403_FORBIDDEN
    message = "Access denied"


class ConflictError(AppException):
    code = "conflict"
    status_code = status.HTTP_409_CONFLICT
    message = "Resource conflict"


class ValidationError(AppException):
    code = "validation_error"
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    message = "Validation failed"


class FeatureNotEnabledError(AppException):
    code = "feature_not_enabled"
    status_code = status.HTTP_403_FORBIDDEN
    message = "Feature not enabled for this clinic"


# ── Handlers ────────────────────────────────────────────────


def _build_payload(code: str, message: str, details: dict[str, Any]) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_build_payload(exc.code, exc.message, exc.details),
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    from fastapi.encoders import jsonable_encoder
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_build_payload(
            "validation_error",
            "Request validation failed",
            {"errors": jsonable_encoder(exc.errors())},
        ),
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    # In production, never leak stack traces. Log it instead.
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_build_payload("internal_error", "Internal server error", {}),
    )
