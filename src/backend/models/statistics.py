from pydantic import BaseModel
from typing import Dict, List

from backend.models.ride import MemberCasual, RideableType

class RideTypeStats(BaseModel):
    """Statistics grouped by rideable type"""
    rideable_type: RideableType
    total_rides: int
    average_duration_minutes: float
    total_distance_km: float

class UserTypeStats(BaseModel):
    """Statistics grouped by user type"""
    user_type: MemberCasual
    total_rides: int
    average_duration_minutes: float
    average_distance_km: float
