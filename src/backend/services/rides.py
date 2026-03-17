import polars as pl
from datetime import date
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.loaders.rides_loader import load_ride_data

# Filter rides based on various criteria.
def get_filtered_rides(
    ride_id: str | None = None,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> pl.LazyFrame:
    """
    Get rides filtered by various criteria.
    Parameters:
    - ride_id: Filter by specific ride ID
    - user_type: Filter by user type (member or casual)
    - start_date, end_date: Filter by ride start date range
    - start_station_id, end_station_id: Filter by station IDs
    - end_date: Filter by ride end date range
    - end_station_id: Filter by end station ID
    Returns a LazyFrame of filtered rides.
    """
    rides = load_ride_data()
    
    # Build filter expression
    filter_expr = pl.lit(True)  # Start with always-true condition
    
    if ride_id is not None:
        filter_expr &= pl.col("ride_id") == ride_id
    
    if user_type is not None:
        filter_expr &= pl.col("member_casual") == user_type.value
    
    if start_date is not None or end_date is not None:
        date_col = pl.col("started_at").dt.date()
    
        if start_date is not None:
            filter_expr &= date_col >= start_date
        if end_date is not None:
            filter_expr &= date_col <= end_date
    
    if start_station_id is not None:
        filter_expr &= pl.col("start_station_id") == start_station_id
    
    if end_station_id is not None:
        filter_expr &= pl.col("end_station_id") == end_station_id
   
    if bike_type is not None:
        filter_expr &= pl.col("rideable_type") == bike_type.value

    return rides.filter(filter_expr)