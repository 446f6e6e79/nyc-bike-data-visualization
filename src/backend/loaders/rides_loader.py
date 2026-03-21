import polars as pl
from typing import Union
from src.backend.config import RIDES_DATA_DIR, TEST_DATA_DIR
from src.backend.loaders.base_loader import load_cached_frame
from src.backend.models.ride import RideableType, MemberCasual

RideFrame = Union[pl.DataFrame, pl.LazyFrame]
_rides_df: RideFrame | None = None

# ONLY CALLED IN TEST MODE TO NORMALIZE TEST DATA TYPES
def _normalize_ride_types(df: RideFrame) -> RideFrame:
    """Normalize test ride column types to be consistent with production schema and avoid mixed-type comparison/join errors."""
    return df.with_columns(
        pl.col("ride_id").cast(str, strict=False),
        pl.col("rideable_type").cast(RideableType, strict=False),
        pl.col("started_at").str.strptime(pl.Datetime, strict=False),
        pl.col("ended_at").str.strptime(pl.Datetime, strict=False),
        pl.col("start_station_name").cast(str, strict=False),
        pl.col("start_station_id").cast(str, strict=False),
        pl.col("end_station_name").cast(str, strict=False),
        pl.col("end_station_id").cast(str, strict=False),
        pl.col("start_lat").cast(float, strict=False),
        pl.col("start_lng").cast(float, strict=False),
        pl.col("end_lat").cast(float, strict=False),
        pl.col("end_lng").cast(float, strict=False),
        pl.col("member_casual").cast(MemberCasual, strict=False),
    )

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
    # If the data is already loaded and cached, return it directly
    if _rides_df is not None:
        return _rides_df

    _rides_df = load_cached_frame(
        label="ride",
        in_memory=inMemory,
        test=test,
        load_test_data=lambda: pl.read_csv(str(TEST_DATA_DIR / "trips.csv")),
        load_production_data=lambda: pl.scan_parquet(
            str(RIDES_DATA_DIR / "**/*.parquet"), hive_partitioning=True
        ),
        normalize_test_data=_normalize_ride_types
    )

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
            (pl.col("started_at").dt.weekday() - 1).is_in([0, 1, 2, 3, 4])
        )
        .then(pl.lit("Weekday"))
        .otherwise(pl.lit("Weekend"))
        .alias("day_type"),
        (
            (pl.col("ended_at") - pl.col("started_at")).dt.total_milliseconds() / 1000
        ).alias("trip_duration"),
    )