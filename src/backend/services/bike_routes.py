import time
from threading import Lock

import requests
from fastapi import HTTPException

from src.backend.config import BIKE_ROUTES_URL, BIKE_ROUTES_TTL_SECONDS

_cache_lock = Lock()
_cache: dict = {
    "timestamp": 0.0,
    "features": None,
}

def _fetch_from_source() -> list[dict]:
    """Fetch GeoJSON feature list from the NYC Open Data endpoint."""
    response = requests.get(BIKE_ROUTES_URL, timeout=(5, 30))
    response.raise_for_status()
    geojson = response.json()
    return geojson.get("features", [])

def fetch_bike_routes(force_refresh: bool = False) -> list[dict]:
    """
    Return bike route GeoJSON features with a 1-hour in-memory cache.
    Falls back to stale cache if the upstream API is unavailable.
    """
    now = time.monotonic()

    with _cache_lock:
        cache_valid = (
            not force_refresh
            and _cache["features"] is not None
            and (now - _cache["timestamp"] < BIKE_ROUTES_TTL_SECONDS)
        )
        if cache_valid:
            return _cache["features"]

    try:
        features = _fetch_from_source()
    except Exception as e:
        with _cache_lock:
            if _cache["features"] is not None:
                return _cache["features"]
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch bike routes: {e}",
        )

    with _cache_lock:
        _cache["timestamp"] = time.monotonic()
        _cache["features"] = features

    return features

def _build_bike_route(feature: dict) -> dict:
    """
    Extract only the fields needed by the frontend from a raw GeoJSON feature.
    Returns a plain dict matching the BikeRoute model.
    """
    props = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    return {
        "geometry": {
            "type": geometry.get("type", "LineString"),
            "coordinates": geometry.get("coordinates", []),
        },
        "street": props.get("street"),
        "facilitycl": props.get("facilitycl"),
        "facilitytyp": props.get("facilitytyp"),
        "tf_facilit": props.get("tf_facilit"),
        "ft_facilit": props.get("ft_facilit"),
        "bikedir": props.get("bikedir"),
        "borough": props.get("borough"),
    }