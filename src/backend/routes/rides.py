import polars as pl
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from models.ride import MemberCasual, Ride, RideableType
from services.rides import get_filtered_rides
from loaders.rides_loader import RideFrame

router = APIRouter(prefix="/rides", tags=["rides"])

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

@router.get("/", response_model=list[Ride])
def get_rides(    
    user_type: MemberCasual,
    bike_type: RideableType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None),
):
    """Get all historical rides."""
    df = get_filtered_rides(user_type=user_type, 
                            bike_type=bike_type,
                            start_date=start_date, 
                            end_date=end_date, 
                            start_station_id=start_station_id, 
                            end_station_id=end_station_id)
    return _collect_if_lazy(df).to_dicts()

@router.get("/by_ride_id/{ride_id}", response_model=Ride)
def get_ride(ride_id: str):
    """Get a single ride by its ID"""
    # Check the validity of the ride_id format
    if not isinstance(ride_id, str):
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be a string.")
    if len(ride_id) != 16:
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be 16 characters long.")
    
    df = get_filtered_rides(ride_id=ride_id)
    result = _collect_if_lazy(df).to_dicts()
    if not result:
        raise HTTPException(status_code=404, detail="Ride not found.")
    return result[0]