import polars as pl
from pathlib import Path
from datetime import datetime, timezone

from src.backend.config import BIKE_ROUTES_URL, BIKE_ROUTES_PATH, PARQUET_COMPRESSION

def _clean_bike_data(df: pl.DataFrame) -> pl.DataFrame:
    # Filter to current facilities only (note capital C)
    df = df.filter(pl.col('status') == 'Current')

    # Drop columns unused by the frontend
    df = df.drop([
        'bikeid',
        'prevbikeid',
        'status',       # redundant after filtering
        'ret_date',     # null for all current records
        'segmentid',    # only needed for LION joins
        'gwsys2',       # sparsely populated
        'spur',         # sparsely populated
        'ft2facilit',   # complex corridors only
        'tf2facilit',   # complex corridors only
    ])

    # Convert boro code to name using Polars-native replace
    boro_mapping = {
        '1': 'Manhattan',
        '2': 'Bronx', 
        '3': 'Brooklyn',
        '4': 'Queens',
        '5': 'Staten Island'
    }

    df = df.with_columns(
        pl.col('boro')
        .cast(pl.String)
        .replace(boro_mapping)
        .alias('boro')
    )
    return df

def _check_bike_routes_cache() -> bool:
    """Check if the bike routes parquet file exists and is fresh (not older than a month)."""
    path = Path(BIKE_ROUTES_PATH)
    # If the file doesn't exist, it's not fresh
    if not path.exists():
        return False

    # Get file modification time (as UTC datetime)
    file_mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    now = datetime.now(timezone.utc)

    file_age_days = (now - file_mtime).days

    # Consider the cache fresh if it's less than or equal to 30 days old
    return file_age_days <= 30

def download_bike_routes(force_download: bool = False) -> None:
    """Download and preprocess bike route data, storing it in a parquet file for fast access by the API."""
    print("Downloading bike route data...")
    # If the file already exists and is fresh, skip downloading to save time and bandwidth
    if not force_download and _check_bike_routes_cache():
        print(f"Bike routes data already exists at {BIKE_ROUTES_PATH} and is fresh, skipping download.")
        return
    
    # Read the file directly from the URL
    df = pl.read_csv(BIKE_ROUTES_URL)

    # Clean the bike data before saving
    df = _clean_bike_data(df)

    # Write the DataFrame to a parquet file for faster future access
    df.write_parquet(
        BIKE_ROUTES_PATH,
        row_group_size=100_000,   # smaller = faster predicate pushdown
        statistics=True,           # enables min/max skipping
        compression=PARQUET_COMPRESSION,
    )
    print(f"Downloaded and saved bike route data to {BIKE_ROUTES_PATH}")
    