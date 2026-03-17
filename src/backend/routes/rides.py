import polars as pl
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.ride import Ride
from services.rides import load_ride_data

router = APIRouter(prefix="/rides", tags=["rides"])

@router.get("/", response_model=list[Ride])
def get_rides():
    """Get all historical rides."""
    df = load_ride_data()
    if isinstance(df, pl.LazyFrame):
        df = df.collect()
    return df.to_dicts()

@router.get("/by_ride_id/{ride_id}", response_model=Ride)
def get_ride(ride_id: str):
    """Get a single ride by its ID."""
    # Check the validity of the ride_id format
    if not isinstance(ride_id, str):
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be a string.")
    if len(ride_id) != 16:
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be 16 characters long.")
    
    # Load ride data and find the ride with the given ID
    df = load_ride_data()
    ride = df.filter(pl.col("ride_id") == ride_id)
    if isinstance(ride, pl.LazyFrame):
        ride = ride.collect()
    if ride.height == 0:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride.row(0, named=True)

@router.get("/by_date/{date}", response_model=list[Ride])
def get_rides_by_date(date: str):
    """Get all rides for a specific date."""
    # Check the validity of the date format
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    df = load_ride_data()
    rides = df.filter(pl.col("started_at").dt.date() == pl.lit(parsed_date))
    if isinstance(rides, pl.LazyFrame):
        rides = rides.collect()
    return rides.to_dicts()