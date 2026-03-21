from pydantic import BaseModel

from src.backend.models.ride import MemberCasual, RideableType

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    number_of_days: int
    average_duration_seconds: float
    average_distance_km: float
    total_duration_seconds: float
    total_distance_km: float

# Extends Stats with a day_of_week field for grouping by day of week (0=Monday, 6=Sunday)
class DayOfWeekStats(Stats):
    """Statistics model grouped by day of week (0=Monday, 6=Sunday)."""
    day_of_week: int

class StationRideCount(BaseModel):
    """Model representing the count of rides starting or ending at a station."""
    station_id: str
    lat: float
    lon: float
    outgoing_rides: int
    incoming_rides: int

class TripsCountBetweenStations(BaseModel):
    station_a: str
    station_b: str
    a_to_b_count: int
    b_to_a_count: int
    total_rides: int