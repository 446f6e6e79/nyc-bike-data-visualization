import polars as pl
from typing import Union
from src.backend.config import RIDES_DATA_DIR, TEST_DATA_DIR

RideFrame = Union[pl.DataFrame, pl.LazyFrame]
_rides_df: RideFrame | None = None

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
        _rides_df = pl.scan_parquet(str(RIDES_DATA_DIR / "**/*.parquet"), hive_partitioning=True)
    
    print("Ride data loaded successfully.")
    
    print("Final data schema:")
    if isinstance(_rides_df, pl.LazyFrame):
        print(_rides_df.collect_schema())
    else:
        print(_rides_df.schema)

    # Collect into memory if inMemory is True or if we are in test mode
    _rides_df = _rides_df.collect() if isinstance(_rides_df, pl.LazyFrame) and inMemory else _rides_df
    return _rides_df

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