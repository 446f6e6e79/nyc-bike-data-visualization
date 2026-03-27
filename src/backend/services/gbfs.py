import time
from threading import Lock
import requests
from fastapi import HTTPException

from src.backend.models.station import StationInfo, Station
from src.backend.config import INFO_URL, STATUS_URL
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

def _build_station_info(station_data: dict) -> StationInfo:
    """Build a StationInfo response model with static station information only."""
    return StationInfo(
        id=str(station_data["short_name"]),
        name=station_data["name"],
        lat=station_data["lat"],
        lon=station_data["lon"],
        capacity=station_data["capacity"],
    )

def _find_station_by_id(station_data: list[dict], station_id: str) -> dict:
    """Find a station by its public short_name identifier."""
    for station in station_data:
        if station["short_name"] == station_id:
            return station

    raise HTTPException(status_code=404, detail="Station not found")

def _merge_station(station_data: dict, station_status_data: dict) -> Station:
    """Build a Station response model from raw info + status data."""
    # Retrieve the status for this station, defaulting to empty dict if not found
    st = station_status_data.get(station_data["station_id"], {})
    
    return Station(
        # To have consistency with historical data, we use the short_name as the station_id
        id=str(station_data["short_name"]),
        name=station_data["name"],
        lat=station_data["lat"],
        lon=station_data["lon"],
        capacity=station_data["capacity"],
        num_bikes_available=st.get("num_bikes_available", 0),
        num_ebikes_available=st.get("num_ebikes_available", 0),
        num_docks_available=st.get("num_docks_available", 0),
        num_bikes_disabled=st.get("num_bikes_disabled", 0),
    )