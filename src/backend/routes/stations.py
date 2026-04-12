from fastapi import APIRouter

from src.backend.models.station import StationInfo, Station
from src.backend.services.gbfs import fetch_station_data, merge_station, build_station_info, find_station_by_id

router = APIRouter(prefix="/stations", tags=["stations"])

@router.get("/", response_model=list[StationInfo])
def get_stations_info():
    """Get all stations with their static information (name, location)"""
    station_data, _ = fetch_station_data()
    return [build_station_info(s) for s in station_data]

@router.get("/availability", response_model=list[Station])
def get_stations_availability():
    station_data, station_status_data = fetch_station_data()
    return [
        merge_station(s, station_status_data)
        for s in station_data
        # Filter out stations that are not currently active
        if (
            (status := station_status_data.get(s["station_id"]))
            and status.get("is_installed") == 1
            and status.get("is_renting") == 1
            and status.get("is_returning") == 1
        )
    ]

@router.get("/empty", response_model=list[Station])
def get_empty_stations():
    """Get all stations that currently have no bikes available."""
    station_data, station_status_data = fetch_station_data()
    # Pre-filter using the raw status field before doing the more expensive merge
    candidate_stations = [
        s for s in station_data
        if station_status_data.get(s["station_id"], {}).get("num_bikes_available", 1) == 0
    ]
    # Merge and apply fine-grained per-vehicle-type checks
    return [
        st for st in (
            merge_station(s, station_status_data) for s in candidate_stations
        )
        if (
            st.num_bikes_available == 0
            and st.num_classic_bikes_available == 0
            and st.num_ebikes_available == 0
            and st.num_docks_available is not None
        )
    ]

@router.get("/{station_id}", response_model=StationInfo)
def get_station_info(station_id: str):
    """Get a single station by its ID."""
    return build_station_info(find_station_by_id(station_id))

@router.get("/{station_id}/availability", response_model=Station)
def get_station_availability(station_id: str):
    """Get a single station's current bike and dock availability by its ID."""
    _, station_status_data = fetch_station_data()
    return merge_station(find_station_by_id(station_id), station_status_data)