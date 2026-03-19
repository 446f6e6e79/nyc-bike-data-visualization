from pydantic import BaseModel

from src.backend.models.ride import MemberCasual, RideableType

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    average_duration_seconds: float
    average_distance_km: float
    total_duration_seconds: float
    total_distance_km: float