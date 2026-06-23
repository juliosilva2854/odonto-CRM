"""JobRunner abstraction. BackgroundTasks impl now; Celery impl later."""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

JobFn = Callable[..., Awaitable[Any]]


class JobRunner(ABC):
    @abstractmethod
    def enqueue(
        self,
        fn: JobFn,
        *args: Any,
        delay_seconds: int = 0,
        **kwargs: Any,
    ) -> None: ...
