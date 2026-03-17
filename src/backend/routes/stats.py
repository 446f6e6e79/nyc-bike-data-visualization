from fastapi import APIRouter, HTTPException

from services.stats import (
    compute_all_ride_type_stats,
    compute_ride_type_stats,
    compute_all_user_type_stats,
    compute_user_type_stats,
    compute_daily_stats,
)
from services.rides import load_ride_data
from services.distances import load_distances_data
from models.stats import DailyStats, RideTypeStats, UserTypeStats
from models.ride import MemberCasual, RideableType

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/ride-types", response_model=list[RideTypeStats])
def get_all_ride_type_stats():
    """Get statistics for all rideable types."""
    # Load ride data and compute statistics for all rideable types
    rides = load_ride_data()
    distances = load_distances_data()
    return compute_all_ride_type_stats(rides, distances)

@router.get("/ride-types/{rideable_type}", response_model=RideTypeStats)
def get_ride_type_stats(rideable_type: RideableType):
    """Get statistics for a specific rideable type."""
    # check the validity of the rideable_type
    if rideable_type not in RideableType:
        raise HTTPException(status_code=400, detail="Invalid rideable type")
    # Load ride data and compute statistics for the specified rideable type
    rides = load_ride_data()
    distances = load_distances_data()
    return compute_ride_type_stats(rides, distances, rideable_type)

@router.get("/user-types", response_model=list[UserTypeStats])
def get_all_user_type_stats():
    """Get statistics for all user types."""
    # Load ride data and compute statistics for all user types
    rides = load_ride_data()
    distances = load_distances_data()
    return compute_all_user_type_stats(rides, distances)

@router.get("/user-types/{user_type}", response_model=UserTypeStats)
def get_user_type_stats(user_type: MemberCasual):
    """Get statistics for a specific user type."""
    # check the validity of the user_type
    if user_type not in MemberCasual:
        raise HTTPException(status_code=400, detail="Invalid user type")
    # Load ride data and compute statistics for the specified user type
    rides = load_ride_data()
    distances = load_distances_data()
    return compute_user_type_stats(rides, distances, user_type)

@router.get("/day", response_model=list[DailyStats])
def get_daily_stats():
    """Get daily statistics for each day of the week."""
    # Load ride data and compute daily statistics
    rides = load_ride_data()
    distances = load_distances_data()
    return compute_daily_stats(rides, distances)
