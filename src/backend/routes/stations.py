from fastapi import APIRouter, HTTPException

from models.station import Station
from services.gbfs import fetch_station_data

router = APIRouter(prefix="/stations", tags=["stations"])

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
        bikes=st.get("num_bikes_available", 0),
        docks=st.get("num_docks_available", 0),
    )

@router.get("/", response_model=list[Station])
def get_stations_info():
    """Get all stations with their static information (name, location)"""
    station_data, _ = fetch_station_data()
    return [
        Station(
            id=str(s["short_name"]), # Use short_name as the station ID for consistency with historical data
            name=s["name"],
            lat=s["lat"],
            lon=s["lon"],
            bikes=None,
            docks=None,
        )
        for s in station_data
    ]

@router.get("/availability", response_model=list[Station])
def get_stations_availability():
    """Get all stations with their current bike and dock availability."""
    station_data, station_status_data = fetch_station_data()
    # Merge the station information and status data to create a list of Station models
    return [_merge_station(s, station_status_data) for s in station_data]

@router.get("/empty", response_model=list[Station])
def get_empty_stations():
    """Get all stations that currently have no bikes available."""
    station_data, station_status_data = fetch_station_data()
    return [
        _merge_station(s, station_status_data)
        for s in station_data
        if station_status_data.get(s["station_id"], {}).get("num_bikes_available", 0) == 0
    ]

@router.get("/{station_id}", response_model=Station)
def get_station_info(station_id: str):
    """Get a single station by its ID."""
    station_data, _ = fetch_station_data()
    for s in station_data:
        if s["short_name"] == station_id: # Use short_name as the station ID for consistency with historical data
            return Station(
                id=str(s["short_name"]),
                name=s["name"],
                lat=s["lat"],
                lon=s["lon"],
                bikes=None,
                docks=None,
            )
    # If no station matches the given ID, return a 404 error
    raise HTTPException(status_code=404, detail="Station not found")

@router.get("/availability/{station_id}", response_model=Station)
def get_station_availability(station_id: str):
    """Get a single station's current bike and dock availability by its ID."""
    station_data, station_status_data = fetch_station_data()
    for s in station_data:
        if s["short_name"] == station_id: # Use short_name as the station ID for consistency with historical data   
            return _merge_station(s, station_status_data)
    # If no station matches the given ID, return a 404 error
    raise HTTPException(status_code=404, detail="Station not found")