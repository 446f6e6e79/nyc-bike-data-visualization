import time
from threading import Lock
import requests
from fastapi import HTTPException

from src.backend.models.station import StationInfo, Station
from src.backend.config import INFO_URL, STATUS_URL
from src.backend.config import TTL_SECONDS, GBFS_CLASSIC_BIKE_TYPE_ID, GBFS_EBIKE_TYPE_ID

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
    # Fetch the raw station information and status data from the GBFS feed with a timeout to prevent hanging.
    info = requests.get(INFO_URL, timeout=(3, 10)).json()["data"]["stations"]
    status = requests.get(STATUS_URL, timeout=(3, 10)).json()["data"]["stations"]

    # Keep only stations that are currently active according to GBFS status flags.
    # GBFS uses integer flags for these fields (1 = true, 0 = false).
    active_status = [
        s
        for s in status
        if s.get("is_installed") == 1 
        and s.get("is_renting") == 1 
        and s.get("is_returning") == 1
    ]

    # Map active station_id -> status dict for quick lookup.
    status_map = {s["station_id"]: s for s in active_status}

    # Filter static station info to only include stations present in the active status map.
    filtered_info = [i for i in info if i.get("station_id") in status_map]

    return filtered_info, status_map

def fetch_station_data(force_refresh: bool = False) -> tuple[list, dict]:
    """
    Return merged station data with a 1-minute in-memory cache.
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
            and (now - _cache["timestamp"] < TTL_SECONDS)
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
    vehicle_types = st.get("vehicle_types_available", [])
    
    """
    The GBFS feed provides a list of available vehicle types and their counts. It's not guaranteed that both classic bikes 
    and e-bikes will be present in the feed at all times, and that the order of vehicle types is consistent. 
    To handle this, we create a mapping of vehicle_type_id to count, 
    and then extract the counts for classic bikes (type_id "1") and e-bikes (type_id "2") safely.
    """
    counts_by_type = {
        vt.get("vehicle_type_id"): vt.get("count", 0)
        for vt in vehicle_types
    }

    return Station(
        # To have consistency with historical data, we use the short_name as the station_id
        id=str(station_data["short_name"]),
        name=station_data["name"],
        lat=station_data["lat"],
        lon=station_data["lon"],
        capacity=station_data["capacity"],
        num_bikes_available=st.get("num_bikes_available", 0),
        num_classic_bikes_available=counts_by_type.get(GBFS_CLASSIC_BIKE_TYPE_ID, 0),
        num_ebikes_available=counts_by_type.get(GBFS_EBIKE_TYPE_ID, 0),
        num_docks_available=st.get("num_docks_available", 0),
        num_bikes_disabled=st.get("num_bikes_disabled", 0),
    )