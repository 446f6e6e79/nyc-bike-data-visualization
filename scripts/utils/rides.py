import gc
import io
import logging
import os
import tempfile
import requests
import zipfile
import polars as pl
from config import PARQUET_COMPRESSION, YEARLY_CUTOFF, BASE_URL_RIDE_DATA, RIDES_DATA_DIR
import xml.etree.ElementTree as ET

log = logging.getLogger(__name__)

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
            log.info(f"[DOWNLOAD] {f} already covered, skipping")
            continue

        # If the start value is set and the file ends before the start value, skip it
        if start_value and min(file_coverage) < start_value:
            continue
        # If the end value is set and the file starts after the end value, skip it
        if end_value and max(file_coverage) > end_value:
            continue
        # If the file passes all filters, add it to the list of filtered files
        filtered_files.append(f)

    log.info(f"[DOWNLOAD] Selected {len(filtered_files)} files")
    return filtered_files

def _find_available_files(base_data_url: str) -> list[str]:
    """
    Get the list of files available in the S3 bucket.
    Args:
        base_data_url (str): The base URL of the S3 bucket.
    Returns:
        list: A list of file keys available in the S3 bucket.
    """
    log.info(f"[DOWNLOAD] Finding files in S3 at {base_data_url}...")
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

    log.info(f"[DOWNLOAD] Found {len(files)} files")
    return files

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

def _read_csv_from_zip(zip_file: zipfile.ZipFile, csv_name: str) -> pl.DataFrame:
    """Read a single CSV out of an open ZipFile into a Polars DataFrame."""
    log.info(f"[PROCESS] Reading {os.path.basename(csv_name)}")
    with zip_file.open(csv_name) as source:
        # Return the DataFrame of the CSV file
        return pl.read_csv(
            source,
            schema_overrides={
                "start_station_id": pl.Utf8,
                "end_station_id": pl.Utf8,
            },
        )

def _download_and_process_file(file_key: str, base_data_url: str):
    """Download a single ZIP file, then yield one DataFrame per month it contains.

    The outer ZIP is streamed to a temp file on disk so it never sits in RAM.
    For the legacy yearly format, each inner monthly ZIP is opened, its CSVs
    are concatenated into a single per-month DataFrame, and that DataFrame is
    yielded before the next inner ZIP is touched. This keeps peak memory at
    one month's worth of rides instead of a full year.
    """
    log.info(f"[DOWNLOAD] Downloading {file_key}...")
    
    # Check if the file exists in the S3 bucket before attempting to download
    response = requests.get(base_data_url + file_key, stream=True)
    response.raise_for_status()

    # Get the total size of the file for progress tracking
    total_size = int(response.headers.get("content-length", 0))
    downloaded_size = 0
    chunk_size = 1024 * 1024 * 10  # 10 MB

    # Create a temporary file to stream the ZIP content into, avoiding loading the entire file into memory
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", prefix="citibike-")
    tmp_path = tmp.name
    
    try:
        try:
            # For each chunk, write it to disk and update the downloaded size
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    tmp.write(chunk)
                    downloaded_size += len(chunk)

                    # If we have the total size information, show progress percentage
                    if total_size > 0:
                        progress_pct = (downloaded_size / total_size) * 100
                        downloaded_mb = downloaded_size / (1024 * 1024)
                        total_mb = total_size / (1024 * 1024)
                        print(
                            f"\r[DOWNLOAD] Download progress for {file_key}: {progress_pct:5.1f}% "
                            f"({downloaded_mb:.1f}/{total_mb:.1f} MB)",
                            end="",
                            flush=True,
                        )
                    # Otherwise, just show the downloaded size in MB without percentage
                    else:
                        downloaded_mb = downloaded_size / (1024 * 1024)
                        print(
                            f"\r[DOWNLOAD] Download progress for {file_key}: {downloaded_mb:.1f} MB",
                            end="",
                            flush=True,
                        )
        finally:
            # Once the download is complete close the temp file
            tmp.close()

        print("")  # New line after progress is complete
        log.info(f"[DOWNLOAD] Finished {file_key}")
        log.info("[PROCESS] Extracting CSV files from ZIP...")

        # Open the downloaded ZIP file and process its contents
        with zipfile.ZipFile(tmp_path) as outer_zip:
            names = outer_zip.namelist()
            # Check if the ZIP contains inner ZIP files (legacy yearly format)
            has_inner_zips = any(n.endswith(".zip") for n in names)

            if has_inner_zips:
                # Pre-202401 yearly format: outer zip contains monthly inner zips.
                # Yield one DataFrame per inner ZIP so the caller can write parquet
                # and free memory before the next month is loaded.
                log.info("[PROCESS] Detected nested ZIP structure (yearly format)")
                
                # Process each inner ZIP file one at a time to keep memory usage low
                for inner_name in names:
                    
                    # If the outer ZIP contains any non-ZIP files, skip them
                    if not inner_name.endswith(".zip"):
                        continue
                    
                    # Open the inner ZIP file directly
                    log.info(f"[PROCESS] Opening inner ZIP {os.path.basename(inner_name)}")
                    with outer_zip.open(inner_name) as inner_raw:
                        inner_bytes = io.BytesIO(inner_raw.read())
                    try:
                        inner_zip_file = zipfile.ZipFile(inner_bytes)
                    #If the inner file isn't a valid ZIP, log a warning and skip it 
                    except zipfile.BadZipFile:
                        log.info(f"[WARN] Skipping {os.path.basename(inner_name)}: not a valid ZIP")
                        del inner_bytes
                        continue
                    
                    # If the inner ZIP is valid, read all CSVs inside it, concatenate them into a single DataFrame, and yield it
                    month_frames = []
                    with inner_zip_file:
                        for csv_name in inner_zip_file.namelist():
                            if csv_name.endswith(".csv"):
                                month_frames.append(_read_csv_from_zip(inner_zip_file, csv_name))
                    # Release the inner ZIP buffer before yielding so it doesn't
                    # stay alive across the parquet-write that follows.
                    del inner_bytes
                    if not month_frames:
                        log.info(f"[WARN] No CSVs found in {os.path.basename(inner_name)}")
                        continue
                    yield pl.concat(month_frames, how="diagonal_relaxed")
                    del month_frames
            else:
                # Post-202401 monthly format: outer zip contains CSVs for a single
                # month directly. Concat any multi-part CSVs and yield once.
                month_frames = [
                    _read_csv_from_zip(outer_zip, name)
                    for name in names
                    if name.endswith(".csv")
                ]
                if not month_frames:
                    log.info("[WARN] No CSV files found in ZIP")
                    return
                yield pl.concat(month_frames, how="diagonal_relaxed")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def download_ride_data(start_date: str, end_date: str, download_jc: bool, current_coverage: list[int]):
    """
    Download each filtered ZIP file from the S3 bucket and convert all CSV files
    inside it into a single parquet file. Yields (year, month) tuples for each
    partition written so callers can process months as they become available.

    current_coverage: list of YYYYMM integers for months already in the DB —
    files whose months are fully covered are skipped.
    """
    available_files = _find_available_files(BASE_URL_RIDE_DATA)
    filtered_files = _filter_files(available_files, current_coverage, start_date, end_date, download_jc=download_jc)

    for f in filtered_files:
        for trip_data in _download_and_process_file(f, BASE_URL_RIDE_DATA):
            log.info("[PROCESS] Cleaning data...")
            trip_data = _clean_rides_data(trip_data)
            log.info("[PROCESS] Data cleaning complete")

            # Extract year and month from cleaned datetime column (REQUIRED for partitioning by year and month in parquet output)
            # Note: this information must be extracted from the ended_at column, not the started_at column, because some files are partitioned by end date rather than start date
            trip_data = trip_data.with_columns(
                pl.col("ended_at").dt.date().alias("date"),
                pl.col("ended_at").dt.year().alias("year"),
                pl.col("ended_at").dt.month().alias("month"),
                pl.col("ended_at").dt.hour().alias("hour"),
                (pl.col("ended_at").dt.weekday() - 1).alias("day_of_week"),
                (pl.col("ended_at") - pl.col("started_at"))
			.dt.total_seconds()
			.alias("trip_duration_seconds")
            )

            # Write the per-month DataFrame to a parquet file, partitioned by year and month.
            # A single inner ZIP can still span more than one month (e.g. trips that ended
            # in the next month), so we yield every (year, month) pair we actually wrote.
            new_month_pairs = trip_data.select(["year", "month"]).unique().rows()
            trip_data.write_parquet(
                RIDES_DATA_DIR,
                row_group_size=100_000,   # smaller = faster predicate pushdown
                statistics=True,           # enables min/max skipping
                partition_by=["year", "month"],
                compression=PARQUET_COMPRESSION)

            log.info(f"[PROCESS] Wrote {trip_data.height} rows -> {RIDES_DATA_DIR} ({f})")

            # Free the per-month DataFrame and force the Polars/Arrow allocator to
            # release before the next inner ZIP is opened — otherwise peak RSS
            # creeps up across months even though the references are gone.
            del trip_data
            gc.collect()

            for year, month in new_month_pairs:
                yield year, month