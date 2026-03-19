from pydantic import BaseModel

from src.backend.models.ride import MemberCasual, RideableType

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    average_duration_seconds: float
    average_distance_km: float
    total_duration_seconds: float
    total_distance_km: float

class StationRideCount(BaseModel):
    """Model representing the count of rides starting or ending at a station."""
    station_id: str
    lat: float
    lon: float
    outgoing_rides: int
    incoming_rides: int

class TipsCountBetweenStations(BaseModel):
    """Model representing the count of rides between two stations."""
    start_station_id: str
    end_station_id: str
    ride_count: int