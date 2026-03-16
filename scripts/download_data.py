"""
    Script to download and merge the bike-sharing trip data from the S3 bucket.
    The script will filter files by date range and dataset type (JC or non-JC)
    and convert the CSV files inside each downloaded ZIP into a single parquet file.
"""
import argparse
import io
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from calendar import monthrange
from datetime import date

import polars as pl
import requests

BASE_DATA_URL = "https://s3.amazonaws.com/tripdata/"
DOWNLOAD_DIR = "data/"
TRIP_DATA_DIR = os.path.join(DOWNLOAD_DIR, "rides/")
STATION_DATA_DIR = os.path.join(DOWNLOAD_DIR, "stations/")
WEATHER_DATA_DIR = os.path.join(DOWNLOAD_DIR, "weather/")
WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/archive"
NYC_COORDS = (40.7823234, -73.9654161)
WEATHER_TIMEZONE = "America/New_York"

# Filter files by date range (MUST BE IN THE FORMAT YYYYMM)
DEFAULT_START_DATE = "202601"
DEFAULT_END_DATE = ""

# Set to True to also download files from the JC dataset
DOWNLOAD_JC = False
YEARLY_CUTOFF = 2023
PARQUET_COMPRESSION = "zstd"

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

def extract_coverage_from_filename(file_name: str) -> tuple[int, int]:
    """
    Extract the coverage period from the file name. 
    The file name can be in one of the following formats:
    - JC-YYYYMM-tripdata.csv.zip (for JC dataset)
    - YYYYMM-tripdata.csv.zip (for non-JC dataset)
    - YYYY-tripdata.csv.zip (for files before 2024)
    Args:
        file_name (str): The name of the file to extract coverage from.
    Returns:
        tuple: A tuple containing the start and end coverage periods in the format (YYYYMM, YYYYMM).
    Raises:
    """
    normalized = file_name
    if normalized.startswith("JC-"):
        normalized = normalized[3:]

    date_part = normalized.split("-")[0]
    if len(date_part) == 4:
        year = int(date_part)
        # If the year is less than or equal to the cutoff, we assume it covers the entire year (January to December)
        if year <= YEARLY_CUTOFF:
            return int(f"{year}01"), int(f"{year}12")
        return int(f"{year}01"), int(f"{year}12")

    if len(date_part) == 6:
        return int(date_part), int(date_part)

    raise ValueError(f"Unsupported date format in file name: {file_name}")

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

def _parse_yyyymm_to_date(date_value: str, *, end_of_month: bool = False) -> date:
    """
    Convert a YYYYMM string to a date at the start or end of that month.
    """
    year = int(date_value[:4])
    month = int(date_value[4:6])
    if end_of_month:
        return date(year, month, monthrange(year, month)[1])
    return date(year, month, 1)

def resolve_filtered_date_bounds(filtered_files: list[str]) -> tuple[str, str]:
    """
    Resolve the minimum and maximum YYYYMM coverage from the filtered trip files.
    """
    if not filtered_files:
        raise ValueError("Cannot resolve date bounds from an empty file list")

    file_ranges = [extract_coverage_from_filename(file_name) for file_name in filtered_files]
    min_coverage = min(start for start, _ in file_ranges)
    max_coverage = max(end for _, end in file_ranges)
    return str(min_coverage), str(max_coverage)

def download_weather_data(min_date: str, max_date: str) -> None:
    """
    Download hourly weather data for exactly the ride coverage range
    and save as parquet partitioned by year only.
    """
    if not min_date and not max_date:
        raise ValueError("At least one of min_date or max_date must be provided")

    range_start = min_date or max_date
    range_end   = max_date or min_date

    # Downloaded the exact range
    start_date = _parse_yyyymm_to_date(range_start)
    end_date   = _parse_yyyymm_to_date(range_end, end_of_month=True)

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
        .with_columns([
            pl.col("time").str.strptime(pl.Datetime, format="%Y-%m-%dT%H:%M"),
        ])
        .with_columns(
            pl.col("time").dt.year().cast(pl.Int16).alias("year"),
        )
    )

    weather_data.write_parquet(
        WEATHER_DATA_DIR,
        partition_by=["year"],          
        compression=PARQUET_COMPRESSION,
    )
    print(f"Wrote {weather_data.height} hourly weather rows to {WEATHER_DATA_DIR}")

def download_and_convert_files(filtered_files: list, base_data_url: str, output_dir: str) -> None:
    """
    Download each filtered ZIP file from the S3 bucket and convert all CSV files
    inside it into a single parquet file.

    Args:
        filtered_files (list): The list of file keys to download and convert.
        base_data_url (str): The base URL of the S3 bucket.
        output_dir (str): The directory to save the parquet files.
    """
    for f in filtered_files:
        # Extract year and month for partitioning from the file name
        start_date, _ = extract_coverage_from_filename(f)
        year = start_date // 100
        month = start_date % 100

        print(f"Downloading {f}...")
        response = requests.get(base_data_url + f)
        response.raise_for_status()
        print(f"Finished downloading {f}, converting to parquet...")

        csv_frames = []
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            # For each file in the ZIP
            for name in zip_file.namelist():
                if not name.endswith(".csv"):
                    continue
                
                csv_name = os.path.basename(name)
                print(f"Reading {csv_name}...")
                # Read each CSV file into a Polars DataFrame and append it to the list
                with zip_file.open(name) as source:
                    csv_frames.append(
                        pl.read_csv(
                            io.BytesIO(source.read()),
                            # Override station ID columns to string to handle any potential non-numeric IDs
                            schema_overrides={
                                "start_station_id": pl.Utf8,
                                "end_station_id": pl.Utf8,
                            },
                        )
                    )
        # If no CSV files were found in the ZIP, skip it
        if not csv_frames:
            print(f"No CSV files found in {f}, skipping.")
            continue
        
        # Concatenate all CSV DataFrames into a single DataFrame
        trip_data = pl.concat(csv_frames, how="diagonal_relaxed")
        
        # Extract year and month from the started_at column for partitioning
        trip_data = trip_data.with_columns([
            pl.lit(year).alias("year"),
            pl.lit(month).alias("month"),
        ])
        # Write the combined DataFrame to a parquet file, partitioned by year and month
        trip_data.write_parquet(
            output_dir,
            partition_by=["year", "month"], 
            compression=PARQUET_COMPRESSION)
        
        print(f"Wrote {trip_data.height} rows to {output_dir} for file {f}")

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
    
    # Create the download directory if it doesn't exist
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(TRIP_DATA_DIR, exist_ok=True)
    os.makedirs(WEATHER_DATA_DIR, exist_ok=True)

    # Find all files in the S3 bucket
    files = find_files(BASE_DATA_URL)

    # Filter files by date range and dataset type
    filtered_files = filter_files(files, args.start_date, args.end_date, args.download_jc)

    # Download and convert the filtered files
    download_and_convert_files(filtered_files, BASE_DATA_URL, TRIP_DATA_DIR)

    # Download hourly weather data spanning the selected trip coverage, with a one-year buffer on both sides
    weather_min_date, weather_max_date = resolve_filtered_date_bounds(filtered_files)
    download_weather_data(weather_min_date, weather_max_date)

if __name__ == "__main__":
    main()