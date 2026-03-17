from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.ride import Ride
from services.rides import list_rides, get_ride_by_id, list_rides_by_date

router = APIRouter(prefix="/rides", tags=["rides"])

@router.get("/", response_model=list[Ride])
def get_rides():
    """Get all historical rides."""
    return list_rides()

@router.get("/by_ride_id/{ride_id}", response_model=Ride)
def get_ride(ride_id: str):
    """Get a single ride by its ID."""
    # Check the validity of the ride_id format
    if not isinstance(ride_id, str):
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be a string.")
    if len(ride_id) != 16:
        raise HTTPException(status_code=400, detail="Invalid ride ID format. Must be 16 characters long.")
    try:
        return get_ride_by_id(ride_id)
    except LookupError as err:
        raise HTTPException(status_code=404, detail=str(err))

@router.get("/by_date/{date}", response_model=list[Ride])
def get_rides_by_date(date: str):
    """Get all rides for a specific date."""
    # Check the validity of the date format
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    return list_rides_by_date(parsed_date)