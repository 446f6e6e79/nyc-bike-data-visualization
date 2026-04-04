from datetime import date
from fastapi import APIRouter, Query
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    DatasetDateRange,
    Stats,
    GroupedStats,
    StationRideCounts,
    TripsCountBetweenStations,
    StatsGroupBy,
    RideCountGroupBy,
)
from src.backend.services.stats.baseStats import get_stats_data
from src.backend.services.stats.flowCounts import get_trips_between_stations_stats
from src.backend.services.stats.stationCounts import get_station_ride_counts_stats
from src.backend.loaders.rides_loader import get_data_range_coverage

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/", response_model=Stats | list[GroupedStats])
def get_stats(    
    group_by: StatsGroupBy = Query(default=StatsGroupBy.NONE),
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date = Query(...),
    end_date: date = Query(...),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None)
):
    """Get historical rides stats, optionally grouped by day_of_week, hour, or both."""
    return get_stats_data(
        group_by=group_by,
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
    )

@router.get("/station_usage_counts", response_model=list[StationRideCounts])
def get_station_ride_counts(
    group_by: RideCountGroupBy = Query(default=RideCountGroupBy.NONE),
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date = Query(...), 
    end_date: date = Query(...),
    station_id: str | None = Query(default=None),
    limit: int | None = Query(default=100, ge=1, le=3000)
):
    """Get the count of rides starting or ending at each station, optionally grouped by day_of_week, hour, or both."""
    return get_station_ride_counts_stats(
        group_by=group_by,
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        station_id=station_id,
        limit=limit,
    )

@router.get("/station_flow_counts", response_model=list[TripsCountBetweenStations])
def get_trips_between_stations(
    group_by: RideCountGroupBy = Query(default=RideCountGroupBy.NONE),
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date = Query(...), 
    end_date: date = Query(...),
    station_id: str | None = Query(default=None),
    limit: int | None = Query(default=100, ge=1, le=1000)
):
    """Get the count of rides between each station pair, optionally grouped by day_of_week, hour, or both."""
    return get_trips_between_stations_stats(
        group_by=group_by,
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        station_id=station_id,
        limit=limit,
    )

@router.get("/date_range", response_model=DatasetDateRange)
def get_date_range():
    """Get the min and max ride dates in the dataset"""
    return get_data_range_coverage()
