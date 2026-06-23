"""StorageBackend interface. Implementations resolve at app boot via Settings."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import BinaryIO


@dataclass(frozen=True)
class StorageObject:
    key: str
    size_bytes: int
    content_type: str


class StorageBackend(ABC):
    @abstractmethod
    async def put(self, key: str, fileobj: BinaryIO, content_type: str) -> StorageObject: ...

    @abstractmethod
    async def get(self, key: str) -> bytes: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...

    @abstractmethod
    async def sign_url(self, key: str, expires_seconds: int = 300) -> str: ...
