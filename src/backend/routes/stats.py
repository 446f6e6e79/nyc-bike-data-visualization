from fastapi import APIRouter, HTTPException

from services.stats import *
from services.historical import load_historical_data
from models.stats import *

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/ride-types/{rideable_type}", response_model=RideTypeStats)
def get_ride_type_stats(rideable_type: RideableType):
    """Get statistics for a specific rideable type."""
    # check the validity of the rideable_type
    if rideable_type not in RideableType:
        raise HTTPException(status_code=400, detail="Invalid rideable type")
    # Load historical data and compute statistics for the specified rideable type
    df = load_historical_data()
    return stats.compute_ride_type_stats(df, rideable_type)

@router.get("/user-types/{user_type}", response_model=UserTypeStats)
def get_user_type_stats(user_type: MemberCasual):
    """Get statistics for a specific user type."""
    # check the validity of the user_type
    if user_type not in MemberCasual:
        raise HTTPException(status_code=400, detail="Invalid user type")
    # Load historical data and compute statistics for the specified user type
    df = load_historical_data()
    return stats.compute_user_type_stats(df, user_type)

