import io
import os
import requests
import zipfile
import polars as pl
from src.backend.config import PARQUET_COMPRESSION, YEARLY_CUTOFF
import xml.etree.ElementTree as ET
import requests

def _extract_coverage_from_filename(file_name: str) -> tuple[int, int]:
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

def _clean_rides_data(df: pl.DataFrame) -> pl.DataFrame:
    """
    Perform basic cleaning on the historical data:
    - Handle missing values by dropping rows with critical missing fields
    - Convert date columns to datetime objects
    """
    required_cols = [
        "start_station_name", "start_station_id",
        "end_station_name", "end_station_id",
        "start_lat", "start_lng",
        "end_lat", "end_lng",
        "member_casual",
        "rideable_type"
    ]

    return (
        df.drop_nulls(subset=required_cols)
        .with_columns(
            pl.col("started_at")
            .str.to_datetime(format="%Y-%m-%d %H:%M:%S%.f", strict=True)
            .alias("started_at"),
            pl.col("ended_at")
            .str.to_datetime(format="%Y-%m-%d %H:%M:%S%.f", strict=True)
            .alias("ended_at"),
        )
        .drop_nulls(subset=["started_at", "ended_at"])
        .filter(pl.col("ended_at") >= pl.col("started_at"))
    )

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
        start_date, _ = _extract_coverage_from_filename(f)
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
        print("Starting data cleaning...")
        trip_data = _clean_rides_data(trip_data)
        print("Data cleaning completed.")
        # Write the combined DataFrame to a parquet file, partitioned by year and month
        trip_data.write_parquet(
            output_dir,
            row_group_size=100_000,   # smaller = faster predicate pushdown
            statistics=True,           # enables min/max skipping
            partition_by=["year", "month"],
            compression=PARQUET_COMPRESSION)
        
        print(f"Wrote {trip_data.height} rows to {output_dir} for file {f}")

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
            file_start, file_end = _extract_coverage_from_filename(f)
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