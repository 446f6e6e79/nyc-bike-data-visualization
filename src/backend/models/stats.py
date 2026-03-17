from pydantic import BaseModel

from src.backend.models.ride import MemberCasual, RideableType

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    average_duration_seconds: float
    average_distance_km: float
    total_duration_seconds: float
    total_distance_km: float
    
class RideTypeStats(BaseModel):
    """Statistics grouped by rideable type"""
    rideable_type: RideableType
    stats : Stats

class UserTypeStats(BaseModel):
    """Statistics grouped by user type"""
    user_type: MemberCasual
    stats : Stats

class DailyStats(BaseModel):
    """Daily statistics."""
    day_of_week: str
    stats : Stats