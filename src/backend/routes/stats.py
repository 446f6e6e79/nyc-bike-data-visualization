from datetime import date
from fastapi import APIRouter, HTTPException, Query
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import DayOfWeekStats, Stats, StationRideCount, TripsCountBetweenStations
from src.backend.services.stats import (
    get_day_of_week_stats,
    get_overall_stats,
    get_station_ride_counts_stats,
    get_trips_between_stations_stats,
)

router = APIRouter(prefix="/stats", tags=["stats"])

def _parse_day_of_week(day_of_week: str | None) -> int | list[int] | None:
    """Parse the day_of_week query parameter, which can be a single integer (0-6) or a comma-separated list of integers."""
    if day_of_week is None:
        return None
    
    # Split the input by commas, strip whitespace, and filter out empty values
    values = [item.strip() for item in day_of_week.split(",") if item.strip()]
    if not values:
        raise HTTPException(
            status_code=422,
            detail="day_of_week must be a comma-separated list of integers between 0 and 6",
        )

    parsed_values = []
    for value in values:
        if not value.isdigit():
            raise HTTPException(
                status_code=422,
                detail="day_of_week must contain only integers between 0 and 6",
            )
        parsed = int(value)
        if parsed < 0 or parsed > 6:
            raise HTTPException(
                status_code=422,
                detail="day_of_week values must be between 0 and 6",
            )
        parsed_values.append(parsed)

    if len(parsed_values) == 1:
        return parsed_values[0]
    return parsed_values

@router.get("/", response_model=Stats)
def get_stats(    
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    day_of_week: str | None = Query(default=None),  # 0=Monday, 6=Sunday, comma-separated supported
    start_hour: int | None = Query(default=None, ge=0, le=23),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None)
):
    """Get all historical rides."""
    # Parse the day_of_week query parameter, which can be a single integer or a comma-separated list of integers
    parsed_day_of_week = _parse_day_of_week(day_of_week)
    return get_overall_stats(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=parsed_day_of_week,
        start_hour=start_hour,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
    )


@router.get("/by_day_of_week", response_model=list[DayOfWeekStats])
def get_stats_by_day_of_week(
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    day_of_week: str | None = Query(default=None),
    start_hour: int | None = Query(default=None, ge=0, le=23),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None),
):
    """Get historical ride stats grouped by day of week (0=Monday, 6=Sunday)."""
    parsed_day_of_week = _parse_day_of_week(day_of_week)
    return get_day_of_week_stats(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=parsed_day_of_week,
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