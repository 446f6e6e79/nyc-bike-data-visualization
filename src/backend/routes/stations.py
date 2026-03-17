from fastapi import APIRouter, HTTPException

from src.backend.models.station import Station
from src.backend.services.gbfs import fetch_station_data, _merge_station, _build_station_info, _find_station_by_id

router = APIRouter(prefix="/stations", tags=["stations"])

@router.get("/", response_model=list[Station])
def get_stations_info():
    """Get all stations with their static information (name, location)"""
    station_data, _ = fetch_station_data()
    return [_build_station_info(s) for s in station_data]

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
    return _build_station_info(_find_station_by_id(station_data, station_id))

@router.get("/{station_id}/availability", response_model=Station)
def get_station_availability(station_id: str):
    """Get a single station's current bike and dock availability by its ID."""
    station_data, station_status_data = fetch_station_data()
    return _merge_station(_find_station_by_id(station_data, station_id), station_status_data)