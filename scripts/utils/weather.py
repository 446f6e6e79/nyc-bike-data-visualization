import requests
import polars as pl
from calendar import monthrange
from datetime import date, timedelta

from src.backend.config import WEATHER_API_URL, NYC_COORDS, WEATHER_TIMEZONE, PARQUET_COMPRESSION, WEATHER_DATA_DIR

def download_weather_data(min_date: str, max_date: str) -> None:
    """
    Download hourly weather data for exactly the ride coverage range
    and save as parquet partitioned by year only.
    """
    if not min_date and not max_date:
        raise ValueError("At least one of min_date or max_date must be provided")

    range_start = min_date or max_date
    # Rides are uploaded monthly, so weather should not include the current (incomplete) month.
    previous_month_end = date.today().replace(day=1) - timedelta(days=1)
    range_end = max_date or previous_month_end.strftime("%Y%m")

    # Downloaded the exact range
    start_date = date(int(range_start[:4]), int(range_start[4:6]), 1)
    end_year, end_month = int(range_end[:4]), int(range_end[4:6])
    end_date = date(end_year, end_month, monthrange(end_year, end_month)[1])

    # Bound end-date to today to avoid requesting future weather data
    end_date = min(end_date, date.today())

    print(f"Downloading weather data from {start_date.isoformat()} to {end_date.isoformat()}...")

    response = requests.get(
        WEATHER_API_URL,
        params={
            "latitude":        NYC_COORDS[0],
            "longitude":       NYC_COORDS[1],
            "start_date":      start_date.isoformat(),
            "end_date":        end_date.isoformat(),
            "hourly":          "temperature_2m,precipitation,weather_code,wind_speed_10m",
            "timezone":        WEATHER_TIMEZONE,
            "wind_speed_unit": "kmh",
        },
        timeout=(5, 120),
    )
    response.raise_for_status()

    hourly = response.json().get("hourly")
    if not hourly or not hourly.get("time"):
        raise ValueError("Weather API response did not include hourly data")

    weather_data = (
        pl.DataFrame({
            "time":         pl.Series(hourly["time"]),
            "temperature":  pl.Series(hourly["temperature_2m"],  dtype=pl.Float32),
            "wind_speed":   pl.Series(hourly["wind_speed_10m"],  dtype=pl.Float32),
            "precipitation":pl.Series(hourly["precipitation"],   dtype=pl.Float32),
            "weather_code": pl.Series(hourly["weather_code"],    dtype=pl.Int16),
        })
        .with_columns(
            pl.col("time").str.strptime(pl.Datetime, format="%Y-%m-%dT%H:%M"),
        )
        .with_columns(
            pl.col("time").dt.year().cast(pl.Int16).alias("year"),
        )
    )

    weather_data.write_parquet(
        WEATHER_DATA_DIR,
        row_group_size=100_000,   # smaller = faster predicate pushdown
        statistics=True,           # enables min/max skipping
        partition_by=["year"],          
        compression=PARQUET_COMPRESSION,
    )
    print(f"Wrote {weather_data.height} hourly weather rows to {WEATHER_DATA_DIR}")
