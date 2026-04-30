import logging
from calendar import monthrange
from datetime import date, timedelta

import polars as pl
import requests

from config import (
    NYC_COORDS,
    PARQUET_COMPRESSION,
    WEATHER_API_URL,
    WEATHER_DATA_DIR,
    WEATHER_TIMEZONE,
)
from utils.cache import is_fresh

log = logging.getLogger(__name__)

def _yyyymm_to_first_of_month(yyyymm: str) -> date:
    """Convert a YYYYMM string into the date of its first day."""
    return date(int(yyyymm[:4]), int(yyyymm[4:6]), 1)

def _yyyymm_to_last_of_month(yyyymm: str) -> date:
    """Convert a YYYYMM string into the date of its last day."""
    year, month = int(yyyymm[:4]), int(yyyymm[4:6])
    return date(year, month, monthrange(year, month)[1])

def _get_date_range(min_date: str, max_date: str) -> tuple[date, date]:
    """Resolve the inclusive day range to query the weather API for.

    If only one of `min_date`/`max_date` is supplied, the range collapses to that
    single month. The end is also capped at the last fully-completed month
    (rides land monthly, so requesting the in-progress month would mismatch).
    """
    if not min_date and not max_date:
        raise ValueError("At least one of min_date or max_date must be provided")

    # Default the missing endpoint: start defaults to max_date's month;
    # end defaults to the previous calendar month (last fully-published rides month).
    previous_month_end = date.today().replace(day=1) - timedelta(days=1)
    range_start_yyyymm = min_date or max_date
    range_end_yyyymm = max_date or previous_month_end.strftime("%Y%m")

    start = _yyyymm_to_first_of_month(range_start_yyyymm)
    end = min(_yyyymm_to_last_of_month(range_end_yyyymm), date.today())
    return start, end

def _create_weather_dataframe(weather_json: dict) -> pl.DataFrame:
    """Convert the Open-Meteo hourly payload into a parquet-ready DataFrame."""
    hourly = weather_json.get("hourly", {})
    if not hourly or not hourly.get("time"):
        raise ValueError("Weather API response did not include hourly data")

    return (
        pl.DataFrame(hourly)
        .with_columns(
            pl.col("time").str.strptime(pl.Datetime, format="%Y-%m-%dT%H:%M").alias("datetime"),
        )
        .with_columns(
            # Year column drives the parquet partitioning
            pl.col("datetime").dt.year().alias("year"),
        )
        .drop("time")
    )

def download_weather_data(min_date: str, max_date: str, force_download: bool = False) -> None:
    """Download hourly NYC weather for the ride coverage range and write year-partitioned parquet."""
    if not force_download and is_fresh(WEATHER_DATA_DIR):
        log.info(f"[DOWNLOAD] Weather data already fresh at {WEATHER_DATA_DIR}, skipping")
        return

    start_date, end_date = _get_date_range(min_date, max_date)

    log.info(f"[DOWNLOAD] Downloading weather {start_date.isoformat()} -> {end_date.isoformat()}...")
    response = requests.get(
        WEATHER_API_URL,
        params={
            "latitude":        NYC_COORDS[0],
            "longitude":       NYC_COORDS[1],
            "start_date":      start_date.isoformat(),
            "end_date":        end_date.isoformat(),
            # Hourly granularity is the smallest resolution available across the full historical range
            "hourly":          "temperature_2m,precipitation,weather_code,wind_speed_10m",
            "timezone":        WEATHER_TIMEZONE,
            "wind_speed_unit": "kmh",
        },
        timeout=(5, 120),
    )
    response.raise_for_status()

    weather_data = _create_weather_dataframe(response.json())
    weather_data.write_parquet(
        WEATHER_DATA_DIR,
        row_group_size=100_000,
        statistics=True,
        partition_by=["year"],
        compression=PARQUET_COMPRESSION,
    )
    log.info(f"[PROCESS] Wrote {weather_data.height} weather rows -> {WEATHER_DATA_DIR}")
