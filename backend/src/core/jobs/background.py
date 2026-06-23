"""BackgroundTasks-based JobRunner (in-process, after-response).

For Phase 1. Same interface as future CeleryJobRunner.
"""
from __future__ import annotations

import asyncio
from typing import Any

import structlog
from fastapi import BackgroundTasks

from src.core.jobs.runner import JobFn, JobRunner

logger = structlog.get_logger(__name__)


class BackgroundTasksRunner(JobRunner):
    """
    Lightweight runner. enqueue() uses asyncio.create_task — fire-and-forget.
    For request-scoped jobs (recommended), inject FastAPI BackgroundTasks instead.
    """

    def enqueue(
        self, fn: JobFn, *args: Any, delay_seconds: int = 0, **kwargs: Any
    ) -> None:
        async def _runner() -> None:
            if delay_seconds > 0:
                await asyncio.sleep(delay_seconds)
            try:
                await fn(*args, **kwargs)
            except Exception as exc:  # noqa: BLE001
                logger.exception("job_failed", job=fn.__name__, error=str(exc))

        asyncio.create_task(_runner())

    @staticmethod
    def enqueue_via_request(
        background_tasks: BackgroundTasks,
        fn: JobFn,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        """Use this when you have a FastAPI BackgroundTasks at hand (preferred)."""
        background_tasks.add_task(fn, *args, **kwargs)
