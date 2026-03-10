from fastapi import APIRouter, HTTPException

from models.station import Station
from services.gbfs import fetch_station_data

router = APIRouter(prefix="/stations", tags=["stations"])


def _merge_station(s: dict, status_map: dict) -> Station:
    """Build a Station response model from raw info + status data."""
    st = status_map.get(s["station_id"], {})
    return Station(
        id=s["station_id"],
        name=s["name"],
        lat=s["lat"],
        lon=s["lon"],
        bikes=st.get("num_bikes_available", 0),
        docks=st.get("num_docks_available", 0),
    )


@router.get("/", response_model=list[Station])
def get_stations():
    """Get all stations with their current bike and dock availability."""
    info, status_map = fetch_station_data()
    return [_merge_station(s, status_map) for s in info]


@router.get("/empty", response_model=list[Station])
def get_empty_stations():
    """Get all stations that currently have no bikes available."""
    info, status_map = fetch_station_data()
    return [
        _merge_station(s, status_map)
        for s in info
        if status_map.get(s["station_id"], {}).get("num_bikes_available", 0) == 0
    ]


@router.get("/{station_id}", response_model=Station)
def get_station(station_id: str):
    """Get a single station by its ID."""
    info, status_map = fetch_station_data()
    for s in info:
        if s["station_id"] == station_id:
            return _merge_station(s, status_map)
    raise HTTPException(status_code=404, detail="Station not found")
