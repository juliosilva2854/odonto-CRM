"""LocalDisk storage backend. Path = STORAGE_LOCAL_PATH / key."""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import BinaryIO

from src.core.storage.base import StorageBackend, StorageObject


class LocalDiskStorage(StorageBackend):
    def __init__(self, base_path: Path) -> None:
        self.base = base_path
        self.base.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        # Prevent path traversal
        target = (self.base / key).resolve()
        if not str(target).startswith(str(self.base.resolve())):
            raise ValueError(f"Invalid storage key: {key}")
        return target

    async def put(self, key: str, fileobj: BinaryIO, content_type: str) -> StorageObject:
        target = self._resolve(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as out:
            shutil.copyfileobj(fileobj, out)
        return StorageObject(key=key, size_bytes=target.stat().st_size, content_type=content_type)

    async def get(self, key: str) -> bytes:
        return self._resolve(key).read_bytes()

    async def delete(self, key: str) -> None:
        path = self._resolve(key)
        if path.exists():
            path.unlink()

    async def sign_url(self, key: str, expires_seconds: int = 300) -> str:
        # Local mode: the API exposes signed URLs via a dedicated endpoint.
        # Here we just return a logical path; the route layer wraps it with a token.
        return f"/api/attachments/download/{key}"
