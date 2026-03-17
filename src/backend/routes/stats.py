from datetime import date

import polars as pl
from fastapi import APIRouter, HTTPException, Query

from src.backend.services.rides import get_filtered_rides
from src.backend.loaders.distances_loader import load_distances_data
from src.backend.models.stats import UserTypeStats
from src.backend.models.ride import MemberCasual

router = APIRouter(prefix="/statistics", tags=["statistics"])

@router.get("/user-types/{user_type}", response_model=UserTypeStats)
def get_user_type_stats(
    user_type: MemberCasual,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None),
):
    """Get statistics for a specific user type."""
    # Validation only
    if end_date is not None and start_date is not None and end_date < start_date:
        raise HTTPException(
            status_code=400, 
            detail="end_date must be on or after start_date"
        )
    
    # Business logic delegated to service layer
    rides = get_filtered_rides(
        user_type=user_type,
        start_date=start_date,
        end_date=end_date,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
    )
    
    distances = load_distances_data()
    #stats = compute_user_type_stats(rides, distances)
    #return stats
    return

