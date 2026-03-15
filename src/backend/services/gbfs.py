import time
from threading import Lock

import requests
from fastapi import HTTPException

# URLs provided by Lyft's GBFS feed
INFO_URL = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_information.json"
STATUS_URL = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json"

# 3-minute cache TTL to reduce load on the external API
CACHE_TTL_SECONDS = 60 * 3

_cache_lock = Lock()
_cache: dict = {
    "timestamp": 0.0,
    "info": None,
    "status_map": None,
}


def _fetch_from_source() -> tuple[list, dict]:
    """
    Fetch station information and status directly from the GBFS source API.
    Returns:
        info:       List of station information dicts.
        status_map: Dict mapping station_id to its status dict.
    """
    info = requests.get(INFO_URL, timeout=(3, 10)).json()["data"]["stations"]
    status = requests.get(STATUS_URL, timeout=(3, 10)).json()["data"]["stations"]
    status_map = {s["station_id"]: s for s in status}
    return info, status_map


def fetch_station_data(force_refresh: bool = False) -> tuple[list, dict]:
    """
    Return merged station data with a 3-minute in-memory cache.
    Set force_refresh=True to bypass the cache and fetch fresh data.
    Falls back to stale cache if the upstream API is unavailable.
    """
    now = time.monotonic()
    # Check cache validity under lock to ensure thread safety
    with _cache_lock:
        cache_valid = (
            not force_refresh
            and _cache["info"] is not None
            and _cache["status_map"] is not None
            and (now - _cache["timestamp"] < CACHE_TTL_SECONDS)
        )
        # If the cache is valid, return it immediately
        if cache_valid:
            return _cache["info"], _cache["status_map"]

    try:
        info, status_map = _fetch_from_source()
    except Exception as e:
        # Fall back to stale cache if available
        with _cache_lock:
            if _cache["info"] is not None and _cache["status_map"] is not None:
                return _cache["info"], _cache["status_map"]
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch station data: {e}",
        )

    with _cache_lock:
        _cache["timestamp"] = time.monotonic()
        _cache["info"] = info
        _cache["status_map"] = status_map

    return info, status_map
