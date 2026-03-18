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

def enrich_rides_with_weather(rides: pl.LazyFrame, weather: pl.LazyFrame) -> pl.LazyFrame:
    """
    Enrich rides with nearest hourly weather record based on started_at.
    Returns rides with a nested `weather` struct column.
    """
    weather_cols = [c for c in weather.columns if c != "time"]
    
    return (
        rides
        .join_asof(
            weather,
            left_on="started_at",
            right_on="time",
            strategy="nearest",
            tolerance="30m",
        )
        .with_columns(
            pl.struct("time", *weather_cols).alias("weather")
        )
        .drop("time", *weather_cols)
    )

def enrich_rides_with_distances(rides: pl.LazyFrame, distances: pl.LazyFrame) -> pl.LazyFrame:
    """
    Enrich rides with distance_km using unordered station pairs.
    rides: start_station_id, end_station_id
    distances: station_id_a, station_id_b (canonicalized with a < b)
    """
    # Issue: Redundant normalization if distances is already canonicalized
    # Consider documenting whether distances MUST be pre-canonicalized
    
    rides_norm = rides.with_columns(
        pl.min_horizontal("start_station_id", "end_station_id").alias("_station_min"),
        pl.max_horizontal("start_station_id", "end_station_id").alias("_station_max"),
    )
    
    # If distances is already canonicalized, simplify:
    distances_select = distances.select([
        pl.col("station_id_a").alias("_station_min"),
        pl.col("station_id_b").alias("_station_max"),
        "distance_km"
    ])
    
    return (
        rides_norm
        .join(distances_select, on=["_station_min", "_station_max"], how="left")
        .drop(["_station_min", "_station_max"])
    )