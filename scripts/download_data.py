"""
    Script to download and merge the bike-sharing trip data from the S3 bucket.
    The script will filter files by date range and dataset type (JC or non-JC)
    and convert the CSV files inside each downloaded ZIP into a single parquet file.
"""
import argparse
import os
import re
from datetime import date

from utils.distances import compute_and_save_station_distances
from utils.rides import download_ride_data
from utils.weather import download_weather_data
from utils.bike_routes import download_bike_routes
from src.backend.config import (
    DATA_DIR,
    RIDES_DATA_DIR,
    WEATHER_DATA_DIR,
    STATION_DATA_DIR,
    DEFAULT_START_DATE,
    DEFAULT_END_DATE,
    DOWNLOAD_JC,
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
    parser.add_argument("--force-download", action="store_true", help="Force re-download of all files, even if they already exist")
    return parser.parse_args()

def main():
    # Parse and validate command-line arguments
    args = parse_args()
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
    
    # Create the download directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(RIDES_DATA_DIR, exist_ok=True)
    os.makedirs(STATION_DATA_DIR, exist_ok=True)
    os.makedirs(WEATHER_DATA_DIR, exist_ok=True)
    os.makedirs(BIKE_ROUTES_DATA_DIR, exist_ok=True)

    # Download and convert the filtered files
    download_ride_data(args.start_date, args.end_date, download_jc=args.download_jc)

    # Extract available GBFS stations, filter to those found in rides, and save pairwise distances
    compute_and_save_station_distances(force_download=args.force_download)

    # Download hourly weather data for the requested date range
    download_weather_data(args.start_date, args.end_date)

    # Download and preprocess bike route data
    download_bike_routes(force_download=args.force_download)
if __name__ == "__main__":
    main()