from datetime import date
from fastapi import APIRouter, Query
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import Stats, StationRideCount, TripsCountBetweenStations
from src.backend.services.stats import (
    get_overall_stats,
    get_station_ride_counts_stats,
    get_trips_between_stations_stats,
)


router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/", response_model=Stats)
def get_stats(    
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    day_of_week: int | None = Query(default=None, ge=0, le=6),  # 0=Monday, 6=Sunday
    start_hour: int | None = Query(default=None, ge=0, le=23),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None)
):
    """Get all historical rides."""
    return get_overall_stats(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=day_of_week,
        start_hour=start_hour,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
    )

@router.get("/station_ride_counts", response_model=list[StationRideCount])
def get_station_ride_counts(
    start_date: date | None = Query(default=None), 
    end_date: date | None = Query(default=None),
    station_id: str | None = Query(default=None),
    limit: int | None = Query(default=100, ge=1, le=3000)
):
    """Get the count of rides starting or ending at each station."""
    return get_station_ride_counts_stats(
        start_date=start_date,
        end_date=end_date,
        station_id=station_id,
        limit=limit,
    )

@router.get("/trips_between_stations", response_model=list[TripsCountBetweenStations])
def get_trips_between_stations(
    start_date: date | None = Query(default=None), 
    end_date: date | None = Query(default=None),
    station_id: str | None = Query(default=None),
    limit: int | None = Query(default=100, ge=1, le=1000)
):
    """Get the count of rides between each station pairs"""
    return get_trips_between_stations_stats(
        start_date=start_date,
        end_date=end_date,
        station_id=station_id,
        limit=limit,
    )