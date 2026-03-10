from fastapi import APIRouter, HTTPException

from services.historical import load_historical_data
from models.statistics import *

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/ride-types/{rideable_type}", response_model=RideTypeStats)
def get_ride_type_stats(rideable_type: RideableType):
    """Get statistics for a specific rideable type."""
    # check the validity of the rideable_type
    if rideable_type not in RideableType:
        raise HTTPException(status_code=400, detail="Invalid rideable type")
    
    #TODO: Implement logic to calculate statistics for the given rideable type
    pass
