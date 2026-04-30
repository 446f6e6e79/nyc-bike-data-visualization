import io
import logging
from pathlib import Path

import polars as pl
import requests

from config import(
    BIKE_ROUTES_PATH,
    BIKE_ROUTES_URL,
    PARQUET_COMPRESSION,
)
from utils.cache import is_fresh

log = logging.getLogger(__name__)

# Mapping between Boro codes used by the NYC OpenData feed and their human-readable names.
_BORO_CODE_TO_NAME_MAPPING = {
    "1": "Manhattan",
    "2": "Bronx",
    "3": "Brooklyn",
    "4": "Queens",
    "5": "Staten Island",
}

# Set of columns from the original CSV that we don't need for our analysis and can drop to save memory and speed up processing.
_UNUSED_COLUMNS = ["prevbikeid", "gwsys2", "spur", "ft2facilit", "tf2facilit"]

def _fetch_bike_routes_csv() -> pl.DataFrame:
    """GET the bike-routes CSV and parse it with Polars."""
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
    """Drop unused columns and replace numeric boro codes with their names."""
    return (
        df
        .drop(_UNUSED_COLUMNS)
        .with_columns(
            pl.col("boro").cast(pl.String).replace(_BORO_CODE_TO_NAME_MAPPING).alias("boro"),
        )
    )

def download_bike_routes(force_download: bool = False) -> pl.DataFrame:
    """Return the cleaned bike-routes DataFrame, refreshing the parquet cache when stale."""
    log.info("[DOWNLOAD] Downloading bike routes...")
    if not force_download and is_fresh(Path(BIKE_ROUTES_PATH)):
        log.info(f"[DOWNLOAD] Bike routes already fresh at {BIKE_ROUTES_PATH}, skipping")
        return pl.read_parquet(BIKE_ROUTES_PATH)

    df = _clean_bike_data(_fetch_bike_routes_csv())
    df.write_parquet(
        BIKE_ROUTES_PATH,
        row_group_size=100_000,
        statistics=True,
        compression=PARQUET_COMPRESSION,
    )
    log.info(f"[PROCESS] Wrote bike routes -> {BIKE_ROUTES_PATH}")
    return df