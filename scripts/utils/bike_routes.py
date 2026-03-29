import polars as pl
from pathlib import Path
from datetime import datetime, timezone

from src.backend.config import BIKE_ROUTES_URL, BIKE_ROUTES_PATH, PARQUET_COMPRESSION

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
    #TODO: implement any necessary preprocessing steps here

    
    # Write the DataFrame to a parquet file for faster future access
    df.write_parquet(
        BIKE_ROUTES_PATH,
        row_group_size=100_000,   # smaller = faster predicate pushdown
        statistics=True,           # enables min/max skipping
        compression=PARQUET_COMPRESSION,
    )
    print(f"Downloaded and saved bike route data to {BIKE_ROUTES_PATH}")
    