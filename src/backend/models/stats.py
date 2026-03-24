from pydantic import BaseModel
from enum import Enum

from src.backend.models.ride import MemberCasual, RideableType

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    days_count: int        # Number of unique days in the dataset, used to calculate average daily counts
    average_duration_seconds: float
    average_distance_km: float
    total_duration_seconds: float
    total_distance_km: float

# Defines how we can group stats: by day_of_week, hour, both, or not at all (none)
class StatsGroupBy(str, Enum):
    NONE = "none"
    DAY_OF_WEEK = "day_of_week"
    HOUR = "hour"
    DAY_OF_WEEK_AND_HOUR = "day_of_week,hour"

# Extends Stats with optional day_of_week and hour fields for grouping by day of week, hour, or both
class GroupedStats(Stats):
    """Statistics model grouped by day of week, hour, or both."""
    day_of_week: int | None = None
    hour: int | None = None

class GroupedStationRideCount(BaseModel):
    """Grouped bucket of rides starting or ending at a station."""
    day_of_week: int | None = None
    hour: int | None = None
    outgoing_rides: int
    incoming_rides: int
    total_rides: int
    days_count: int        # Number of unique days in the dataset for this station, used to calculate average daily counts

class StationRideCounts(BaseModel):
    """Station-level metadata with grouped ride buckets."""
    station_id: str
    lat: float
    lon: float
    groups: list[GroupedStationRideCount]

class GroupedTripsCountBetweenStations(BaseModel):
    """Count of trips between two stations, grouped by day of week, hour, or both."""
    day_of_week: int | None = None
    hour: int | None = None
    a_to_b_count: int
    b_to_a_count: int
    total_rides: int
    days_count: int     # Number of unique days in the dataset for this station pair, used to calculate average daily counts

class TripsCountBetweenStations(BaseModel):
    """Station-level metadata with grouped trip count buckets between station pairs."""
    station_a_id: str
    station_a_lat: float | None
    station_a_lon: float | None
    station_b_id: str
    station_b_lat: float | None
    station_b_lon: float | None
    groups: list[GroupedTripsCountBetweenStations]