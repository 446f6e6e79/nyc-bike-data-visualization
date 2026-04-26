import requests
import polars as pl
from calendar import monthrange
from datetime import date, timedelta

from config import WEATHER_API_URL, NYC_COORDS, WEATHER_TIMEZONE, PARQUET_COMPRESSION, WEATHER_DATA_DIR

def _get_date_range(min_date: str, max_date: str) -> tuple[date, date]:
    """
    Helper function to determine the actual date range for weather data retrieval based on provided min and max dates.
    Args:
        min_date (str): Minimum date in YYYYMM format.
        max_date (str): Maximum date in YYYYMM format.
    Returns:
        Tuple of (start_date, end_date) as date objects representing the actual range to retrieve.
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
    
    return start_date, end_date

def _create_weather_dataframe(weather_json: dict) -> pl.DataFrame:
    """
    Helper function to convert the weather JSON response into a Polars DataFrame with appropriate data types and transformations.
    Args:
        weather_json (dict): The JSON response from the weather API containing hourly weather data.
    Returns:
        pl.DataFrame: A Polars DataFrame with processed weather data, including a 'year' column for partitioning.
    """
    hourly = weather_json.get("hourly", {})
    if not hourly or not hourly.get("time"):
        raise ValueError("Weather API response did not include hourly data")

    weather_data = pl.DataFrame(hourly)
    # Convert time to datetime and extract year for partitioning
    weather_data = weather_data.with_columns(
        pl.col("time").str.strptime(pl.Datetime, format="%Y-%m-%dT%H:%M").alias("datetime")
    ).with_columns(
        # Add a 'year' column for partitioning, extracted from the datetime
        pl.col("datetime").dt.year().alias("year")
    ).drop("time")  # Drop original time column as we now have datetime

    return weather_data

def download_weather_data(min_date: str, max_date: str) -> None:
    """
    Download hourly weather data for exactly the ride coverage range
    and save as parquet partitioned by year only.
    """
    # Determine the actual date range to retrieve based on provided min and max dates
    start_date, end_date = _get_date_range(min_date, max_date)

    print(f"[DOWNLOAD] Downloading weather {start_date.isoformat()} → {end_date.isoformat()}...")

    response = requests.get(
        WEATHER_API_URL,
        params={
            "latitude":        NYC_COORDS[0],
            "longitude":       NYC_COORDS[1],
            "start_date":      start_date.isoformat(),
            "end_date":        end_date.isoformat(),
            # USE HOURLY DATA, as smaller granularity is only available for recent years
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
        row_group_size=100_000,   # smaller = faster predicate pushdown
        statistics=True,           # enables min/max skipping
        partition_by=["year"],          
        compression=PARQUET_COMPRESSION,
    )
    print(f"[PROCESS] Wrote {weather_data.height} weather rows → {WEATHER_DATA_DIR}")