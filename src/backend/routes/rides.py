import pandas as pd
from datetime import datetime

from fastapi import APIRouter, HTTPException

from models.ride import Ride
from services.rides import load_ride_data

router = APIRouter(prefix="/rides", tags=["rides"])

@router.get("/", response_model=list[Ride])
def get_rides():
    """Get all historical rides."""
    df = load_ride_data()
    return df.to_dict(orient="records")

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
    ride = df[df['ride_id'] == ride_id]
    if ride.empty:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride.iloc[0].to_dict()

@router.get("/by_date/{date}", response_model=list[Ride])
def get_rides_by_date(date: str):
    """Get all rides for a specific date."""
    # Check the validity of the date format
    try:
        parsed_date = pd.to_datetime(date).date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    df = load_ride_data()
    rides = df[df['started_at'].dt.date == parsed_date]
    return rides.to_dict(orient="records")