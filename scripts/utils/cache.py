"""Shared file-cache utilities."""
from datetime import datetime, timezone
from pathlib import Path

from config import MAX_CACHE_AGE_DAYS

def is_fresh(file_path: Path) -> bool:
    """Return True if file_path exists and its mtime is within MAX_CACHE_AGE_DAYS."""
    if not file_path.exists():
        return False
    mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
    return (datetime.now(timezone.utc) - mtime).days <= MAX_CACHE_AGE_DAYS
