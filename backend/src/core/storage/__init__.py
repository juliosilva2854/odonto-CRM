from src.core.config import get_settings
from src.core.storage.base import StorageBackend, StorageObject
from src.core.storage.local import LocalDiskStorage


def get_storage() -> StorageBackend:
    """Factory — resolves backend from settings. S3 impl will be added in Phase 3."""
    settings = get_settings()
    if settings.STORAGE_BACKEND == "local":
        return LocalDiskStorage(settings.STORAGE_LOCAL_PATH)
    raise NotImplementedError(f"Storage backend '{settings.STORAGE_BACKEND}' not implemented yet")


__all__ = ["StorageBackend", "StorageObject", "get_storage"]
