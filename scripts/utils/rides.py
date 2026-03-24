import io
import os
import requests
import zipfile
import polars as pl
from src.backend.config import PARQUET_COMPRESSION, YEARLY_CUTOFF
import xml.etree.ElementTree as ET


def _get_response(url: str, stream: bool = False) -> requests.Response:
    """Execute HTTP GET and raise for non-2xx responses."""
    response = requests.get(url, stream=stream)
    response.raise_for_status()
    return response

def _extract_coverage_from_filename(file_name: str) -> list[int]:
    """
    Extract the coverage period from the file name. 
    The file name can be in one of the following formats:
    - JC-YYYYMM-tripdata.csv.zip (for JC dataset)
    - YYYYMM-tripdata.csv.zip (for non-JC dataset)
    - YYYY-tripdata.csv.zip (for files before YEARLY_CUTOFF, which cover the entire year)
    Args:
        file_name (str): The name of the file to extract coverage from.
    Returns:
        list: A list containing the months covered by the file
    Raises:
    """
    normalized = file_name
    if normalized.startswith("JC-"):
        # Remove the "JC-" prefix to simplify parsing
        normalized = normalized[3:]
    # Taking the part before the first dash to handle both YYYYMM and YYYY formats
    date_part = normalized.split("-")[0]

    # YYYY case
    if len(date_part) == 4:
        year = int(date_part)
        # If the year is less than or equal to the cutoff, we assume it covers the entire year (January to December)
        if year <= YEARLY_CUTOFF:
            return [year * 100 + month for month in range(1, 13)]
        else:
            raise ValueError(f"Unsupported date format in file name: {file_name}")
    # YYYYMM case
    if len(date_part) == 6:
        month = int(date_part) % 100
        year = int(date_part) // 100
        return [year * 100 + month]

    raise ValueError(f"Unsupported date format in file name: {file_name}")

def _filter_files(available_files: list, current_coverage: list, start_date: str, end_date: str, download_jc: bool) -> list:
    """
    Filter the list of available files based on the specified date range, dataset type, and current coverage.
    Args:
        available_files (list): The list of file keys to filter.
        current_coverage (list): A list of tuples containing the start and end coverage periods.
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

    for f in available_files:
        # If the file is from the JC dataset and we don't want to download it, skip it
        if f.startswith("JC") and not download_jc:
            continue
        try:
            # Extract the coverage period from the file name
            file_coverage = _extract_coverage_from_filename(f)
            
            # Check if ALL months covered by current file are already covered by existing files
            is_covered = True
            for month in file_coverage:
                # If the month is not covered by any existing file
                if month not in current_coverage:
                    is_covered = False
                    break
        except ValueError:
            continue
        
        # If the file is fully covered by existing files, skip it
        if is_covered:
            print(f"File {f} is already covered by existing files, skipping.")
            continue

        # If the start value is set and the file ends before the start value, skip it
        if start_value and min(file_coverage) < start_value:
            continue
        # If the end value is set and the file starts after the end value, skip it
        if end_value and max(file_coverage) > end_value:
            continue
        # If the file passes all filters, add it to the list of filtered files
        filtered_files.append(f)

    print(f"Selected {len(filtered_files)} files")
    return filtered_files

def _find_available_files(base_data_url: str) -> list[str]:
    """
    Get the list of files available in the S3 bucket.
    Args:
        base_data_url (str): The base URL of the S3 bucket.
    Returns:
        list: A list of file keys available in the S3 bucket.
    """
    print(f"Finding available files in S3 bucket at {base_data_url}...")
    # Get S3 bucket index
    response = _get_response(base_data_url)
    
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

def _find_current_coverage(DIR_PATH: str) -> list[tuple[int, int]]:
    """
    Find the current coverage of already downloaded files to avoid unnecessary downloads.
    Args:        
        DIR_PATH (str): The directory path where the downloaded files are stored.
    Returns:        
        list: A list of tuples containing the start and end coverage periods in the format (YYYYMM, YYYYMM).
    """
    coverage = []
    # Current files are stored in the format {DIR_PATH}/year=YYYY/month=MM/*.parquet
    # We traverse the directory structure to find all parquet files and extract their coverage periods from their file paths
    for year_dir in os.listdir(DIR_PATH):
        for month_dir in os.listdir(os.path.join(DIR_PATH, year_dir)):
            for file in os.listdir(os.path.join(DIR_PATH, year_dir, month_dir)):
                if file.endswith(".parquet"):
                    try:
                        # Get last 4 digits of the year and last 2 digits of the month to reconstruct the YYYYMM format
                        year = year_dir.split("=")[1]
                        month = month_dir.split("=")[1]
                        month = month.zfill(2)  # Ensure month is 2 digits

                        file_coverage = year + month
                        coverage.append(int(file_coverage))
                    except ValueError:
                        continue
    return coverage

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
        # Remove all rows with missing required columns 
        df.drop_nulls(subset=required_cols)
        .with_columns(
            # Convert started_at to datetime format
            pl.col("started_at")
            .str.to_datetime(format="%Y-%m-%d %H:%M:%S%.f", strict=True)
            .alias("started_at"),
            # Convert ended_at to datetime format
            pl.col("ended_at")
            .str.to_datetime(format="%Y-%m-%d %H:%M:%S%.f", strict=True)
            .alias("ended_at"),
        )
        # Drop rows with invalid datetime formats that couldn't be parsed
        .drop_nulls(subset=["started_at", "ended_at"])
        # Filter out rows where ended_at is before started_at, which are likely data errors
        .filter(pl.col("ended_at") >= pl.col("started_at"))
    )

def _download_and_process_file(file_key: str, base_data_url: str) -> pl.DataFrame:
    """Download and process a single ZIP file in one streaming operation."""
    print(f"Downloading {file_key}...")
    # Check if the file exists in the S3 bucket before attempting to download
    response = requests.get(base_data_url + file_key, stream=True)
    response.raise_for_status()
    # Get the total size of the file for progress tracking
    total_size = int(response.headers.get("content-length", 0))
    downloaded_size = 0
    chunk_size = 1024 * 1024 * 10  # 10 MB
    
    # Use BytesIO to accumulate chunks for ZIP processing
    buffer = io.BytesIO()
    
    for chunk in response.iter_content(chunk_size=chunk_size):
        # For each chunk, write it to the buffer and update the downloaded size
        if chunk:
            buffer.write(chunk)
            downloaded_size += len(chunk)

            # If we have the total size information, show progress percentage
            if total_size > 0:
                progress_pct = (downloaded_size / total_size) * 100
                downloaded_mb = downloaded_size / (1024 * 1024)
                total_mb = total_size / (1024 * 1024)
                print(
                    f"\rDownload progress for {file_key}: {progress_pct:5.1f}% "
                    f"({downloaded_mb:.1f}/{total_mb:.1f} MB)",
                    end="",
                    flush=True,
                )
            # Otherwise, just show the downloaded size in MB without percentage
            else:
                downloaded_mb = downloaded_size / (1024 * 1024)
                print(
                    f"\rDownload progress for {file_key}: {downloaded_mb:.1f} MB",
                    end="",
                    flush=True,
                )
    
    print()  # New line after progress is complete
    print(f"Finished downloading {file_key}")
    print("Extracting CSV files from ZIP content...")
    
    # Process the ZIP content directly from the buffer
    buffer.seek(0)
    csv_frames = []
    
    with zipfile.ZipFile(buffer) as zip_file:
        for name in zip_file.namelist():
            if name.endswith(".csv"):
                csv_name = os.path.basename(name)
                print(f"Reading {csv_name}...")
                with zip_file.open(name) as source:
                    csv_frames.append(
                        pl.read_csv(
                            source,
                            # Override the schema for station ID columns to ensure string type
                            schema_overrides={
                                "start_station_id": pl.Utf8,
                                "end_station_id": pl.Utf8,
                            },
                        )
                    )
    
    if not csv_frames:
        print("No CSV files found in ZIP.")
        return pl.DataFrame()
    
    print(f"Extracted {len(csv_frames)} CSV files from ZIP, combining into a single DataFrame...")
    return pl.concat(csv_frames, how="diagonal_relaxed")

def download_ride_data(start_date: str, end_date: str, base_data_url: str, output_dir: str, download_jc: bool) -> None:
    """
    Download each filtered ZIP file from the S3 bucket and convert all CSV files
    inside it into a single parquet file.

    Args:
        file_key (str): The key of the file to download.
        base_data_url (str): The base URL of the S3 bucket.
        output_dir (str): The directory to save the parquet files.
    """
    # Check which files are available in the S3 bucket and filter them by date range and dataset type
    available_files = _find_available_files(base_data_url)
    
    # Check the current coverage of already downloaded files to avoid unnecessary downloads
    current_coverage = _find_current_coverage(output_dir)

    # Filter files by date range and dataset type
    filtered_files = _filter_files(available_files, current_coverage, start_date, end_date, download_jc=download_jc)
    
    for f in filtered_files:
        trip_data = _download_and_process_file(f, base_data_url)
        
        print("Starting data cleaning...")
        trip_data = _clean_rides_data(trip_data)
        print("Data cleaning completed.")

        # Extract year and month from cleaned datetime column (REQUIRED for partitioning by year and month in parquet output)
        # Note: this information must be extracted from the ended_at column, not the started_at column, because some files are partitioned by end date rather than start date
        trip_data = trip_data.with_columns(
            pl.col("ended_at").dt.strftime("%Y%m").cast(pl.Int32).alias("year_month"),
            pl.col("ended_at").dt.year().alias("year"),
            pl.col("ended_at").dt.month().alias("month")
        )

        # Write the combined DataFrame to a parquet file, partitioned by year and month
        trip_data.write_parquet(
            output_dir,
            row_group_size=100_000,   # smaller = faster predicate pushdown
            statistics=True,           # enables min/max skipping
            partition_by=["year", "month"],
            compression=PARQUET_COMPRESSION)
        
        print(f"Wrote {trip_data.height} rows to {output_dir} for file {f}")