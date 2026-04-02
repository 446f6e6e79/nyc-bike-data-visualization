import polars as pl
from datetime import date
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.loaders.rides_loader import load_ride_data
from src.backend.loaders.weather_loader import load_weather_data
from src.backend.loaders.distances_loader import load_distances_data

# Filter rides based on various criteria.
def get_filtered_rides(
    ride_id: str | None = None,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
    join_weather: bool = False,
    join_distances: bool = False
) -> pl.LazyFrame:
    """
    Get rides filtered by various criteria (in AND fashion). 
    All parameters are optional and can be combined to apply multiple filters at once.
    Parameters:
    - ride_id: Filter by specific ride ID
    - user_type: Filter by user type (member or casual)
    - start_date, end_date: Filter by ride start date range
    - start_station_id, end_station_id: Filter by station IDs
    - end_date: Filter by ride end date range
    - end_station_id: Filter by end station ID
    - join_weather: Whether to join with weather data
    - join_distances: Whether to join with distance data
    Returns a LazyFrame of filtered rides.
    """
    rides = load_ride_data()
    
    # Build filter expression based on provided parameters
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
    
    # Filter the rides based on the combined filter expression before any joins to optimize performance
    rides = rides.filter(filter_expr)
    
    if join_weather:
        weather = load_weather_data()
        rides = _enrich_rides_with_weather(rides, weather)
    
    if join_distances:
        distances = load_distances_data()
        rides = _enrich_rides_with_distances(rides, distances)
    return rides

def add_trip_duration(rides: pl.LazyFrame) -> pl.LazyFrame:
    """Add a trip_duration_seconds column to the rides"""
    return rides.with_columns(
        (pl.col("ended_at") - pl.col("started_at"))
        .dt.total_seconds() # convert to seconds
        .alias("trip_duration_seconds")
    )

def _enrich_rides_with_weather(rides: pl.LazyFrame, weather: pl.LazyFrame) -> pl.LazyFrame:
    # Normalize weather column names to match the Pydantic response model up front
    weather = weather.rename({
        "datetime": "time",
        "temperature_2m": "temperature",
        "wind_speed_10m": "wind_speed",
        "weather_code": "weather_code",
        "precipitation": "precipitation",
    })
    weather_cols = [c for c in weather.collect_schema().names() if c != "time"]

    return (
        rides
        .sort("started_at")
        .join_asof(
            weather.sort("time"),
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

def _enrich_rides_with_distances(rides: pl.LazyFrame, distances: pl.LazyFrame) -> pl.LazyFrame:
    """
    Enrich rides with distance_km using unordered station pairs.
    rides: start_station_id, end_station_id
    distances: station_id_a, station_id_b (canonicalized with a < b)
    """
    # Since distances are stored with station_id_a < station_id_b, we create a new column inside rides that has the min and
    # max of start_station_id and end_station_id to join on.
    rides_norm = rides.with_columns(
        pl.min_horizontal("start_station_id", "end_station_id").alias("_station_min"),
        pl.max_horizontal("start_station_id", "end_station_id").alias("_station_max"),
    )
    # Rename distance columns to match the normalized station columns for joining
    distances_select = distances.select([
        pl.col("station_id_a").alias("_station_min"),
        pl.col("station_id_b").alias("_station_max"),
        "distance_km"
    ])
    # Simple join on the normalized station ID pairs to get the distance, then drop the normalized columns
    return (
        rides_norm
        .join(distances_select, on=["_station_min", "_station_max"], how="left")
        .drop(["_station_min", "_station_max"])
    )