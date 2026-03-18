import polars as pl
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from src.backend.models.ride import MemberCasual, Ride, RideableType
from src.backend.services.rides import get_filtered_rides, enrich_rides_with_weather, enrich_rides_with_distances
from src.backend.loaders.rides_loader import RideFrame
from src.backend.loaders.weather_loader import load_weather_data
from src.backend.loaders.distances_loader import load_distances_data

router = APIRouter(prefix="/rides", tags=["rides"])

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

@router.get("/", response_model=list[Ride])
def get_rides(    
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None),
    join_weather: bool = Query(default=False),
    join_distances: bool = Query(default=False)
):
    """Get all historical rides."""
    rides = get_filtered_rides(user_type=user_type, 
                            bike_type=bike_type,
                            start_date=start_date, 
                            end_date=end_date, 
                            start_station_id=start_station_id, 
                            end_station_id=end_station_id,
                            join_weather=join_weather,
                            join_distances=join_distances)
    return _collect_if_lazy(rides).to_dicts()

@router.get("/by_ride_id/{ride_id}", response_model=Ride)
def get_ride(ride_id: str, join_weather: bool = Query(default=False), join_distances: bool = Query(default=False)):
    """Get a single ride by its ID"""
    # Check the validity of the ride_id format
    if not isinstance(ride_id, str):
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be a string.")
    if len(ride_id) != 16:
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be 16 characters long.")
    
    rides = get_filtered_rides(ride_id=ride_id, join_weather=join_weather, join_distances=join_distances)
    
    result = _collect_if_lazy(result)
    # Check if the result is empty after filtering by ride_id
    if result.is_empty():
        raise HTTPException(status_code=404, detail="Ride not found")
    return _collect_if_lazy(result).to_dicts()[0]