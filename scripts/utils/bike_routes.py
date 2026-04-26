import io
import requests
import polars as pl
from pathlib import Path
from datetime import datetime, timezone

from config import BIKE_ROUTES_URL, BIKE_ROUTES_PATH, PARQUET_COMPRESSION

def _fetch_bike_routes_csv() -> pl.DataFrame:
    """Fetch bike routes CSV bytes over HTTPS and parse with Polars."""
    try:
        response = requests.get(BIKE_ROUTES_URL, timeout=(5, 120))
        response.raise_for_status()
    except requests.exceptions.SSLError as exc:
        raise RuntimeError(
            "TLS certificate verification failed while downloading bike routes. "
            "If you're using the python.org macOS installer, run 'Install Certificates.command' "
            "and retry."
        ) from exc
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Failed to download bike routes CSV: {exc}") from exc

    return pl.read_csv(io.BytesIO(response.content))

def _clean_bike_data(df: pl.DataFrame) -> pl.DataFrame:
    # Filter to current facilities only (note capital C)
    df = df.filter(pl.col('status') == 'Current')

    # Drop columns unused by the frontend
    df = df.drop([
        'prevbikeid',
        'status',       # redundant after filtering
        'ret_date',     # null for all current records
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

def download_bike_routes(force_download: bool = False) -> pl.DataFrame:
    """Download and preprocess bike route data, storing it in a parquet file for fast access.

    Returns the cleaned DataFrame (from cache or fresh download) for DB insertion.
    """
    print("Downloading bike route data...")
    if not force_download and _check_bike_routes_cache():
        print(f"Bike routes data already exists at {BIKE_ROUTES_PATH} and is fresh, skipping download.")
        return pl.read_parquet(BIKE_ROUTES_PATH)

    df = _fetch_bike_routes_csv()
    df = _clean_bike_data(df)
    df.write_parquet(
        BIKE_ROUTES_PATH,
        row_group_size=100_000,   # smaller = faster predicate pushdown
        statistics=True,           # enables min/max skipping
        compression=PARQUET_COMPRESSION,
    )
    print(f"Downloaded and saved bike route data to {BIKE_ROUTES_PATH}")
    return df
    