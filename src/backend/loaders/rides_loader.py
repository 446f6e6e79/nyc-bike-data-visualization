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

def _set_current_coverage(dir_path: str | Path) -> tuple[int | None, int | None]:
    """
    Return the min and max covered periods from the downloaded parquet folders.

    Example:
        (202401, 202603)
    """
    coverage: list[int] = []

    for year_dir in os.listdir(dir_path):
        year_path = os.path.join(dir_path, year_dir)
        if not os.path.isdir(year_path) or not year_dir.startswith("year="):
            continue

        for month_dir in os.listdir(year_path):
            month_path = os.path.join(year_path, month_dir)
            if not os.path.isdir(month_path) or not month_dir.startswith("month="):
                continue

            try:
                year = year_dir.split("=")[1]
                month = month_dir.split("=")[1].zfill(2)
                coverage.append(int(f"{year}{month}"))
            except (IndexError, ValueError):
                continue

    if not coverage:
        return None, None

    min_coverage = str(min(coverage))
    max_coverage = str(max(coverage))

    # Convert the min and max coverage strings into date objects
    min_coverage_date = f"{min_coverage[:4]}-{min_coverage[4:]}-01"
    # For the max coverage, we want to return the last 
    year = int(max_coverage[:4])
    month = int(max_coverage[4:])
    last_day = calendar.monthrange(year, month)[1]
    max_coverage_date = f"{year}-{str(month).zfill(2)}-{last_day}"

    global _dataset_date_range
    _dataset_date_range = DatasetDateRange(
        min_date=min_coverage_date,
        max_date=max_coverage_date,
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
    _set_current_coverage(RIDES_DATA_DIR)

    return _rides_df