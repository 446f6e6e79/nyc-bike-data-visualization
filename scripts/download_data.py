"""
    Script to download and merge the bike-sharing trip data from the S3 bucket.
    The script will filter files by date range and dataset type (JC or non-JC)
    and convert the CSV files inside each downloaded ZIP into a single parquet file.
"""
import argparse
import os
import re
import requests
from datetime import date
import xml.etree.ElementTree as ET

from utils.distances import compute_and_save_station_distances
from utils.rides import download_and_convert_files, extract_coverage_from_filename
from utils.weather import download_weather_data
from src.backend.config import (
    BASE_DATA_URL,
    DOWNLOAD_DIR,
    RIDES_DATA_DIR,
    WEATHER_DATA_DIR,
    STATION_DATA_DIR,
    DEFAULT_START_DATE,
    DEFAULT_END_DATE,
    DOWNLOAD_JC,
)

def find_files(base_data_url: str) -> list[str]:
    """
    Get the list of files available in the S3 bucket.
    Args:
        base_data_url (str): The base URL of the S3 bucket.
    Returns:
        list: A list of file keys available in the S3 bucket.
    """
    # Get S3 bucket index
    response = requests.get(base_data_url)
    response.raise_for_status()
    
    # Parse the XML response
    root = ET.fromstring(response.text)

    # Extract file keys
    files = []
    for content in root.findall("{http://s3.amazonaws.com/doc/2006-03-01/}Contents"):
        key = content.find("{http://s3.amazonaws.com/doc/2006-03-01/}Key").text
        if key.endswith(".zip"):
            files.append(key)

    print(f"Found {len(files)} files")
    return files

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
    if int(date_value[:4]) < 2013 or int(date_value[:4]) > 2060:
        raise ValueError(f"{arg_name} must be in YYYYMM format")

    # Validate that the month is between 1 and 12
    month = int(date_value[4:6])
    if month < 1 or month > 12:
        raise ValueError(f"{arg_name} must be in YYYYMM format")


def filter_files(files: list, start_date: str, end_date: str, download_jc: bool) -> list:
    """
    Filter the list of files by date range and dataset type (JC or non-JC).
    Args:
        files (list): The list of file keys to filter.
        start_date (str): The start date in the format YYYYMM.
        end_date (str): The end date in the format YYYYMM.
        download_jc (bool): Whether to include JC dataset files.
    Returns:
        list: A filtered list of file keys that match the criteria.
    """
    # Extract the date part from the file name and filter by date range
    start_value = int(start_date) if start_date else None
    end_value = int(end_date) if end_date else None
    filtered_files = []

    for f in files:
        # If the file is from the JC dataset and we don't want to download it, skip it
        if f.startswith("JC") and not download_jc:
            continue
        try:
            # Extract the coverage period from the file name
            file_start, file_end = extract_coverage_from_filename(f)
        except ValueError:
            continue

        # If the start value is set and the file ends before the start value, skip it
        if start_value and file_end < start_value:
            continue
        # If the end value is set and the file starts after the end value, skip it
        if end_value and file_start > end_value:
            continue
        # If the file passes all filters, add it to the list of filtered files
        filtered_files.append(f)
    print(f"Selected {len(filtered_files)} files")
    return filtered_files

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
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(RIDES_DATA_DIR, exist_ok=True)
    os.makedirs(STATION_DATA_DIR, exist_ok=True)
    os.makedirs(WEATHER_DATA_DIR, exist_ok=True)

    # Find all files in the S3 bucket
    files = find_files(BASE_DATA_URL)

    # Filter files by date range and dataset type
    filtered_files = filter_files(files, args.start_date, args.end_date, args.download_jc)

    # Download and convert the filtered files
    download_and_convert_files(filtered_files, BASE_DATA_URL, RIDES_DATA_DIR)

    # Extract available GBFS stations, filter to those found in rides, and save pairwise distances
    compute_and_save_station_distances()

    # Download hourly weather data for the requested date range
    download_weather_data(args.start_date, args.end_date)

if __name__ == "__main__":
    main()