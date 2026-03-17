import polars as pl
from datetime import date
from models.ride import MemberCasual
from loaders.rides_loader import load_ride_data, RideFrame

"""
    TODO: check for other possible data cleaning steps / feature extraction.
    E.g., check if it is possible to extract the length of the trip from the start and end station coordinates
"""

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

def list_rides() -> list[dict]:
    """Return all historical rides."""
    df = load_ride_data()
    return _collect_if_lazy(df).to_dicts()

def get_ride_by_id(ride_id: str) -> dict:
    """Return a single ride by ID."""
    ride_df = _collect_if_lazy(
        load_ride_data().filter(pl.col("ride_id") == ride_id).limit(1)
    )
    if ride_df.height == 0:
        raise LookupError("Ride not found")
    return ride_df.row(0, named=True)

def list_rides_by_date(parsed_date: date) -> list[dict]:
    """Return all rides for a specific parsed date."""
    rides = load_ride_data().filter(pl.col("started_at").dt.date() == pl.lit(parsed_date))
    return _collect_if_lazy(rides).to_dicts()

#TODO: remove this. Think if we have to add it to the download_data script or if we can do it on the fly in the stats computation
def _extract_features(df: RideFrame) -> RideFrame:
    """
    Extract ride-level features from cleaned historical data:
    - Time-based features (year, month, day of week, hour, day type)
    - Trip duration
    """
    return df.with_columns(
        pl.col("started_at").dt.year().alias("start_year"),
        pl.col("started_at").dt.month().alias("start_month"),
        pl.col("started_at").dt.to_string("%A").alias("start_day_of_week"),
        pl.col("started_at").dt.hour().alias("start_hour"),
        pl.when(
            pl.col("started_at").dt.weekday().is_in([0, 1, 2, 3, 4])
        )
        .then(pl.lit("Weekday"))
        .otherwise(pl.lit("Weekend"))
        .alias("day_type"),
        (
            (pl.col("ended_at") - pl.col("started_at")).dt.total_milliseconds() / 1000
        ).alias("trip_duration"),
    )

# Example of filtering function
def get_filtered_rides(
    user_type: MemberCasual | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> pl.LazyFrame:
    """Get rides filtered by various criteria."""
    rides = load_ride_data()
    
    # Build filter expression
    filter_expr = pl.lit(True)  # Start with always-true condition
    
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
    
    return rides.filter(filter_expr)