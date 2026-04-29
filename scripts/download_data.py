"""
    Script to download and merge the bike-sharing trip data from the S3 bucket.
    The script will filter files by date range and dataset type (JC or non-JC)
    and convert the CSV files inside each downloaded ZIP into a single parquet file.
"""
import argparse
import logging
import os
import re
from concurrent.futures import FIRST_EXCEPTION, ThreadPoolExecutor, wait
from datetime import date
import shutil
import psycopg2

from utils.distances import compute_and_save_station_distances
from utils.logging_setup import configure_logging, log_memory
from utils.rides import download_ride_data
from utils.weather import download_weather_data
from utils.bike_routes import download_bike_routes
from utils.pg_loader import assert_no_coverage_gaps, get_loaded_months, init_db, load_stats_for_month, load_weather_hourly, update_dataset_coverage, upsert_station_metadata_from_gbfs
from scripts.utils.db_loaders.bike_routes import upsert_bike_routes
from config import (
    DATA_DIR,
    RIDES_DATA_DIR,
    WEATHER_DATA_DIR,
    STATION_DATA_DIR,
    DEFAULT_START_DATE,
    DEFAULT_END_DATE,
    DOWNLOAD_JC,
    PARALLEL_MONTHS,
    DB_LOADER_WORKERS,
    BIKE_ROUTES_DATA_DIR,
)

def validate_yyyymm(date_value: str, arg_name: str) -> None:
    """
    Validate that the provided date value is in the format YYYYMM and represents a valid month.
    Args:        
        date_value (str): The date value to validate.
        arg_name (str): The name of the argument for error messages.
    Raises:        
        ValueError: If the date value is not in the correct format or represents an invalid month.
    """
    if not date_value:
        return
    if not re.fullmatch(r"\d{6}", date_value):
        raise ValueError(f"{arg_name} must be in YYYYMM format")
    # Check the year is between 2013 (when Citi Bike launched) and 2060 (a reasonable upper bound for future data)
    if int(date_value[:4]) < 2013 or int(date_value[:4]) > 2060:
        raise ValueError(f"{arg_name} must be in YYYYMM format")

    # Validate that the month is between 1 and 12
    month = int(date_value[4:6])
    if month < 1 or month > 12:
        raise ValueError(f"{arg_name} must be in YYYYMM format")

def parse_args() -> argparse.Namespace:
    """
    Parse command-line arguments for the script.
    Returns:
        argparse.Namespace: The parsed command-line arguments.
    """
    parser = argparse.ArgumentParser(description="Download Citi Bike tripdata ZIP files and convert them to parquet")
    parser.add_argument("--start-date", default=DEFAULT_START_DATE, help="Start date in YYYYMM")
    parser.add_argument("--end-date", default=DEFAULT_END_DATE, help="End date in YYYYMM")
    parser.add_argument("--download-jc", action="store_true", default=DOWNLOAD_JC, help="Include JC files")
    parser.add_argument("--parallel-months", type=int, default=PARALLEL_MONTHS, help="Number of months to load into the DB concurrently")
    parser.add_argument("--db-loader-workers", type=int, default=DB_LOADER_WORKERS, help="Number of inner threads per month for parallel DB inserts")
    parser.add_argument("--force-download", action="store_true", help="Force re-download of all files, even if they already exist")
    return parser.parse_args()

def _effective_date_range(conn, requested_start: str, requested_end: str) -> tuple[str, str]:
    """Expand the date range in either direction to avoid gaps with existing DB coverage.

    - If the DB max is M and requested start > M+1, start is pulled back to M+1.
    - If the DB min is M and requested end < M-1, end is pushed forward to M-1.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT min_date, max_date FROM dataset_coverage WHERE id = 1")
        row = cur.fetchone()

    # If no coverage info is found, return the requested range as-is
    if not row or not row[0]:
        return requested_start, requested_end

    def _next(ym: int) -> int:
        """Given a year-month in YYYYMM format, return the next month in YYYYMM format."""
        y, m = ym // 100, ym % 100
        return (y + 1) * 100 + 1 if m == 12 else ym + 1

    def _prev(ym: int) -> int:
        """Given a year-month in YYYYMM format, return the previous month in YYYYMM format."""
        y, m = ym // 100, ym % 100
        return (y - 1) * 100 + 12 if m == 1 else ym - 1

    # Extract the min and max year-month from the database coverage info
    min_date, max_date = row
    db_min_ym = min_date.year * 100 + min_date.month
    db_max_ym = max_date.year * 100 + max_date.month

    effective_start = int(requested_start)
    effective_end = int(requested_end)
    
    if effective_start > _next(db_max_ym):
        effective_start = _next(db_max_ym)
        print(f"[PROCESS] Expanding start date {requested_start} -> {effective_start} to fill coverage gap")

    if  effective_end < _prev(db_min_ym):
        effective_end = _prev(db_min_ym)
        print(f"[PROCESS] Expanding end date {requested_end} -> {effective_end} to fill coverage gap")

    return str(effective_start), str(effective_end)

log = logging.getLogger(__name__)

def _load_month(year: int, month: int, db_loader_workers: int) -> None:
    """Helper to load a single month of rides data into Postgres, with memory logging and error handling."""
    log_memory("month-start", month=f"{year}-{month:02d}")
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        load_stats_for_month(conn, year, month, db_loader_workers)
        conn.commit()
    except Exception:
        log.exception(f"[DB] {year}-{month:02d} failed")
        raise
    finally:
        conn.close()
        log_memory("month-end", month=f"{year}-{month:02d}")

def main():
    configure_logging()
    # Parse and validate command-line arguments
    args = parse_args()
    log.info(
        f"[CONFIG] parallel_months={args.parallel_months} "
        f"db_loader_workers={args.db_loader_workers} "
        f"log_level={os.getenv('LOG_LEVEL', 'INFO')}"
    )
    validate_yyyymm(args.start_date, "--start-date")
    validate_yyyymm(args.end_date, "--end-date")
    
    # Validate that start date is less than or equal to end date
    if args.start_date and args.end_date and int(args.start_date) > int(args.end_date):
        raise ValueError("--start-date must be less than or equal to --end-date")
    # Validate that the dataset doesn't go beyond the current month 
    current_yyyymm = date.today().strftime("%Y%m")
    if args.start_date and int(args.start_date) > int(current_yyyymm):
        raise ValueError("--start-date cannot be in the future")
    if args.end_date and int(args.end_date) > int(current_yyyymm):
        raise ValueError("--end-date cannot be in the future")
    
    print(f"[INFO] Using date range {args.start_date} to {args.end_date}, download JC files: {args.download_jc}, force download: {args.force_download}")

    # Create the download directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(RIDES_DATA_DIR, exist_ok=True)
    os.makedirs(STATION_DATA_DIR, exist_ok=True)
    os.makedirs(WEATHER_DATA_DIR, exist_ok=True)
    os.makedirs(BIKE_ROUTES_DATA_DIR, exist_ok=True)

    # Connect to Postgres
    conn = psycopg2.connect(os.environ["DATABASE_URL"])

    # Initialise the database schema from postgres/schemas/*.sql
    init_db(conn)
    upsert_station_metadata_from_gbfs(conn)

    # Expand date range if needed to fill any gap with existing DB coverage
    start_date, end_date = _effective_date_range(conn, args.start_date, args.end_date)

    print(f"[INFO] Effective date range for processing: {start_date} to {end_date}")
    
    # Extract available GBFS stations, filter to those found in rides, and save pairwise distances
    compute_and_save_station_distances(force_download=args.force_download)

    # Download hourly weather data and load it into weather_hourly
    download_weather_data(start_date, end_date)
    load_weather_hourly(conn)

    # Download and preprocess bike route data, then upsert into Postgres.
    # Done before the heavy rides loop so an upstream NYC OpenData failure fails fast
    # instead of after hours of ride processing.
    df_routes = download_bike_routes(force_download=args.force_download)
    upsert_bike_routes(conn, df_routes)
    conn.commit()

    # Download ride data and process each month into Postgres as soon as its parquet is ready,
    # overlapping DB loading with the download of the next month.
    # DB coverage is used to skip months already fully loaded, avoiding redundant downloads.
    current_coverage = get_loaded_months(conn)
    # Fail-fast pool: if any month raises, cancel pending work and re-raise immediately
    # instead of silently continuing to submit (and start) more months.
    with ThreadPoolExecutor(
        max_workers=args.parallel_months,
        thread_name_prefix="month-loader",
    ) as executor:
        futures = {
            executor.submit(_load_month, year, month, args.db_loader_workers): (year, month)
            for year, month in download_ride_data(
                start_date,
                end_date,
                download_jc=args.download_jc,
                current_coverage=current_coverage,
            )
        }
        done, not_done = wait(futures, return_when=FIRST_EXCEPTION)
        for f in not_done:
            f.cancel()
        for f in done:
            f.result()

    # Check for any coverage gaps
    assert_no_coverage_gaps(conn)

    # Update dataset_coverage with the new min/max dates after loading
    update_dataset_coverage(conn)

    # Close the database connection
    conn.close()

    # Remove the downloaded parquet files to save space (optional, comment out if you want to keep them)
    shutil.rmtree(RIDES_DATA_DIR)

if __name__ == "__main__":
    main()