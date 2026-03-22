from pydantic import BaseModel
from enum import Enum

from src.backend.models.ride import MemberCasual, RideableType

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    number_of_days: int
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

class StationRideCount(BaseModel):
    """Model representing the count of rides starting or ending at a station."""
    station_id: str
    lat: float
    lon: float
    outgoing_rides: int
    incoming_rides: int

class TripsCountBetweenStations(BaseModel):
    station_a: str
    station_a_lat: float
    station_a_lon: float
    station_b: str
    station_b_lat: float
    station_b_lon: float
    a_to_b_count: int
    b_to_a_count: int
    total_rides: int