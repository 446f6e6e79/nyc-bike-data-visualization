import polars as pl
from datetime import date, datetime
from pathlib import Path
from typing import Union
from models.ride import MemberCasual

"""
    TODO: check for other possible data cleaning steps / feature extraction.
    E.g., check if it is possible to extract the length of the trip from the start and end station coordinates
"""
RideFrame = Union[pl.DataFrame, pl.LazyFrame]
_rides_df: RideFrame | None = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "data"
RIDE_DATA_DIR = DATA_DIR / "rides"
TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"

# TODO: move this to a loader module and do the same for distances data and weather data
def load_ride_data(inMemory: bool=False, test=False) -> RideFrame:
    """
    Load all historical CitiBike trip CSV files from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern

    Parameters:
    - test: if True, load the data from the committed test dataset instead of the full historical data. This is useful for testing and development to avoid loading large datasets.
    - inMemory: if True, collect the LazyFrame into a DataFrame and keep it in memory for faster access on subsequent calls. If False, return a LazyFrame that will be executed on demand.
    """
    global _rides_df
    if _rides_df is not None:
        return _rides_df
    
    print("Loading ride data...")

    if test:
        # If we are in test mode, load the csv file from the committed test dataset
        print("Test mode enabled: loading data from committed test dataset.")
        _rides_df = pl.read_csv(str(TEST_DATA_DIR / "trips.csv"))
    
    else:
        # Otherwise, scan all parquet files recursively from partitioned folders
        _rides_df = pl.scan_parquet(str(RIDE_DATA_DIR / "**/*.parquet"), hive_partitioning=True)
    print("Ride data loaded successfully.")

    print("Cleaning data...")
    time = datetime.now()
    #_rides_df = _clean_data(_rides_df)
    print(f"Data cleaned in {(datetime.now() - time).total_seconds():.2f} seconds.")

    print("Extracting ride features...")
    time = datetime.now()
    #_rides_df = _extract_features(_rides_df)
    print(f"Ride features extracted in {(datetime.now() - time).total_seconds():.2f} seconds.")
    
    print("Final data schema:")
    if isinstance(_rides_df, pl.LazyFrame):
        print(_rides_df.collect_schema())
    else:
        print(_rides_df.schema)

    print("Data loaded and cleaned successfully.")
    # Collect into memory if inMemory is True or if we are in test mode
    _rides_df = _rides_df.collect() if isinstance(_rides_df, pl.LazyFrame) and inMemory else _rides_df
    return _rides_df

#TODO: remove this and add to download_data script
def _clean_data(df: RideFrame) -> RideFrame:
    """
    Perform basic cleaning on the historical data:
    - Handle missing values by dropping rows with critical missing fields
    - Convert date columns to datetime objects
    """
    # Drop rows missing critical fields
    required_cols = [
        "start_station_name", "start_station_id",
        "end_station_name", "end_station_id",
        "start_lat", "start_lng",
        "end_lat", "end_lng",
        "member_casual",
    ]
    df = df.drop_nulls(subset=required_cols)

    # Parse timestamps if they are still strings (e.g. when loaded from CSV)
    schema = None
    try:
        schema = df.collect_schema() if isinstance(df, pl.LazyFrame) else df.schema
    except Exception:
        schema = None

    for col in ("started_at", "ended_at"):
        if schema is None or schema.get(col) == pl.Utf8:
            df = df.with_columns(
                pl.col(col).cast(pl.Utf8).str.strptime(pl.Datetime, strict=False)
            )

    # Drop rows where timestamps could not be parsed or trip ends before it starts
    df = df.drop_nulls(subset=["started_at", "ended_at"])
    df = df.filter(pl.col("ended_at") >= pl.col("started_at"))
    return df

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
    start_date: pl.date | None = None,
    end_date: pl.date | None = None,
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