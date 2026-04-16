import polars as pl
from typing import Union
from src.backend.config import RIDES_DATA_DIR, TEST_DATA_DIR
from src.backend.loaders.base_loader import load_cached_frame
from src.backend.models.ride import RideableType, MemberCasual
from src.backend.models.stats import DatasetDateRange
import calendar
import os
from pathlib import Path


RideFrame = Union[pl.DataFrame, pl.LazyFrame]
_rides_df: RideFrame | None = None
_dataset_date_range: DatasetDateRange | None = None

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

def list_rides_months_partitions(dir_path: str | Path) -> list[tuple[int, int]]:
    """
    Return a sorted list of (year, month) tuples for every hive partition found
    under dir_path (i.e. year=YYYY/month=MM directories).
    """
    partitions: list[tuple[int, int]] = []

    if not os.path.isdir(dir_path):
        return []

    for year_dir in os.listdir(dir_path):
        year_path = os.path.join(dir_path, year_dir)
        if not os.path.isdir(year_path) or not year_dir.startswith("year="):
            continue

        for month_dir in os.listdir(year_path):
            month_path = os.path.join(year_path, month_dir)
            if not os.path.isdir(month_path) or not month_dir.startswith("month="):
                continue

            try:
                year = int(year_dir.split("=")[1])
                month = int(month_dir.split("=")[1].zfill(2))
                partitions.append((year, month))
            except (IndexError, ValueError):
                continue
    return sorted(partitions)

def _set_current_coverage(dir_path: str | Path) -> None:
    """Set the global _dataset_date_range variable to reflect the min and max ride dates in the dataset based on the hive partition directories."""
    global _dataset_date_range
    partitions = list_rides_months_partitions(dir_path)
    if not partitions:
        _dataset_date_range = None
        return

    min_year, min_month = partitions[0]
    max_year, max_month = partitions[-1]

    # Get the last day of the max month using calendar module
    last_day_of_max_month = calendar.monthrange(max_year, max_month)[1]

    _dataset_date_range = DatasetDateRange(
        min_date=f"{min_year}-{str(min_month).zfill(2)}-01",
        max_date=f"{max_year}-{str(max_month).zfill(2)}-{last_day_of_max_month}"
    )

def get_data_range_coverage():
    """Get the min and max ride dates in the dataset"""
    global _dataset_date_range
    return _dataset_date_range

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

    # Fetch data range coverage stats
    if not test:  
        _set_current_coverage(RIDES_DATA_DIR)

    return _rides_df