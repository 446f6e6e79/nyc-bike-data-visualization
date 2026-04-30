import io
import logging
import os
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import polars as pl
import requests

from config import (
    BASE_URL_RIDE_DATA,
    DOWNLOAD_CHUNK_SIZE_MB,
    PARQUET_COMPRESSION,
    RIDES_DATA_DIR,
    YEARLY_CUTOFF,
)

log = logging.getLogger(__name__)

# Some files mix integer and string station IDs across CSVs; force Utf8 so concat
# works without a manual cast pass.
_RIDES_CSV_SCHEMA_OVERRIDES = {
    "start_station_id": pl.Utf8,
    "end_station_id": pl.Utf8,
}

_REQUIRED_RIDE_COLS = [
    "start_station_name", "start_station_id",
    "end_station_name", "end_station_id",
    "start_lat", "start_lng",
    "end_lat", "end_lng",
    "member_casual",
    "rideable_type",
]

def _get_response(url: str, stream: bool = False) -> requests.Response:
    """GET `url` and raise for non-2xx responses."""
    response = requests.get(url, stream=stream)
    response.raise_for_status()
    return response

def _extract_coverage_from_filename(file_name: str) -> list[int]:
    """Return the YYYYMM months covered by a file based on its name.

    Accepted shapes: JC-YYYYMM-tripdata.csv.zip, YYYYMM-tripdata.csv.zip, or
    YYYY-tripdata.csv.zip (yearly bundles for years <= YEARLY_CUTOFF).
    """
    normalized = file_name[3:] if file_name.startswith("JC-") else file_name
    date_part = normalized.split("-")[0]

    if len(date_part) == 4:
        year = int(date_part)
        if year <= YEARLY_CUTOFF:
            return [year * 100 + month for month in range(1, 13)]
        raise ValueError(f"Unsupported date format in file name: {file_name}")

    if len(date_part) == 6:
        year, month = int(date_part) // 100, int(date_part) % 100
        return [year * 100 + month]

    raise ValueError(f"Unsupported date format in file name: {file_name}")

def _filter_files(
    available_files: list[str],
    current_coverage: list[int],
    start_date: str,
    end_date: str,
    download_jc: bool,
) -> list[str]:
    """Filter S3 keys by date range, JC flag, and existing DB coverage."""
    start_date_value = int(start_date) if start_date else None
    end_date_value = int(end_date) if end_date else None
    current_coverage_set = set(current_coverage)
    filtered: list[str] = []

    for f in available_files:
        # Skip JC files if not requested
        if f.startswith("JC") and not download_jc:
            continue

        try:
            # Get the coverage months for this file
            file_coverage = _extract_coverage_from_filename(f)
        except ValueError:
            continue
        
        # If all months in this file are already covered, skip it
        if all(month in current_coverage_set for month in file_coverage):
            log.info(f"[DOWNLOAD] {f} already covered, skipping")
            continue
        
        # Skip files that are entirely outside the requested date range
        if start_date_value and min(file_coverage) < start_date_value:
            log.info(f"[DOWNLOAD] {f} is outside the requested date range, skipping")
            continue
        if end_date_value and max(file_coverage) > end_date_value:
            log.info(f"[DOWNLOAD] {f} is outside the requested date range, skipping")
            continue
        filtered.append(f)

    log.info(f"[DOWNLOAD] Selected {len(filtered)} files")
    return filtered

def _find_available_files(base_data_url: str) -> list[str]:
    """List the .zip keys advertised by the S3 bucket index XML."""
    # The S3 bucket index is an XML document listing all files; we parse it to find
    log.info(f"[DOWNLOAD] Finding files in S3 at {base_data_url}...")
    response = _get_response(base_data_url)
    # Parse the XML response to extract the list of file keys
    root = ET.fromstring(response.text)
    
    name_space = "{http://s3.amazonaws.com/doc/2006-03-01/}"

    files = [
        content.find(f"{name_space}Key").text
        for content in root.findall(f"{name_space}Contents")
        if content.find(f"{name_space}Key").text.endswith(".zip")
    ]
    log.info(f"[DOWNLOAD] Found {len(files)} files")
    return files

def _print_download_progress(downloaded: int, total: int, label: str) -> None:
    """Render an in-place download progress line on stdout."""
    downloaded_mb = downloaded / (1024 * 1024)
    # If the total size is known, show percentage
    if total > 0:
        total_mb = total / (1024 * 1024)
        pct = (downloaded / total) * 100
        msg = f"{pct:5.1f}% ({downloaded_mb:.1f}/{total_mb:.1f} MB)"
    # Otherwise, just show the downloaded MB without percentage
    else:
        msg = f"{downloaded_mb:.1f} MB"
    print(f"\r[DOWNLOAD] Download progress for {label}: {msg}", end="", flush=True)

@contextmanager
def _stream_zip_to_disk(file_key: str, base_data_url: str) -> Iterator[Path]:
    """Stream a remote ZIP to a temp file and yield its Path; unlink on exit.
    This allows us to handle files larger than memory without manual cleanup of temp files.
    Parameters:
        - file_key: the S3 key of the ZIP file to download.
        - base_data_url: the base URL of the S3 bucket.
    Yields:
        - Path to the downloaded temporary ZIP file on disk.
    """
    log.info(f"[DOWNLOAD] Downloading {file_key}...")
    response = requests.get(base_data_url + file_key, stream=True)
    response.raise_for_status()

    # Get the total size of the file
    total_size = int(response.headers.get("content-length", 0))
    chunk_size = 1024 * 1024 * DOWNLOAD_CHUNK_SIZE_MB

    # Create a temporary file to stream the ZIP content into
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", prefix="citibike-")
    tmp_path = Path(tmp.name)
    
    try:
        # Keep track of the total downloaded size to report progress
        downloaded = 0
        with tmp:
            # For each chunk of the response, write it to the temp file and update progress
            for chunk in response.iter_content(chunk_size=chunk_size):
                if not chunk:
                    continue
                tmp.write(chunk)
                downloaded += len(chunk)
                # Update the progress display after each chunk
                _print_download_progress(downloaded, total_size, file_key)
        # After the download is complete, print a newline to move past the progress line
        print()
        log.info(f"[DOWNLOAD] Finished {file_key}")
        # Yield the path to the downloaded ZIP file for processing
        yield tmp_path
    
    # Once file processing is done, ensure the temporary file is deleted
    finally:
        try:
            tmp_path.unlink()
        except OSError:
            pass

@contextmanager
def _open_inner_zip(outer_zip: zipfile.ZipFile, inner_name: str) -> Iterator[zipfile.ZipFile]:
    """Read an inner ZIP entry into a BytesIO and yield it as an open ZipFile."""
    with outer_zip.open(inner_name) as inner_raw:
        inner_bytes = io.BytesIO(inner_raw.read())
    with zipfile.ZipFile(inner_bytes) as inner_zip:
        yield inner_zip

def _read_csvs_from_zip(zip_file: zipfile.ZipFile) -> list[pl.DataFrame]:
    """Read every .csv entry in `zip_file` into a list of DataFrames."""
    frames: list[pl.DataFrame] = []
    for csv_name in zip_file.namelist():
        if not csv_name.endswith(".csv"):
            continue
        log.info(f"[PROCESS] Reading {os.path.basename(csv_name)}")
        with zip_file.open(csv_name) as source:
            frames.append(pl.read_csv(source, schema_overrides=_RIDES_CSV_SCHEMA_OVERRIDES))
    return frames

def _iter_month_frames(zip_path: Path) -> Iterator[pl.DataFrame]:
    """Yield one concatenated DataFrame per month found in `zip_path`.

    Two formats are supported:
    - Legacy yearly bundle: outer ZIP contains 12 inner monthly ZIPs.
    - Monthly: outer ZIP contains the CSVs for a single month directly.
    """
    log.info("[PROCESS] Extracting CSV files from ZIP...")
    with zipfile.ZipFile(zip_path) as outer_zip:
        names = outer_zip.namelist()

        if any(n.endswith(".zip") for n in names):
            log.info("[PROCESS] Detected nested ZIP structure (yearly format)")
            for inner_name in names:
                if not inner_name.endswith(".zip"):
                    continue
                log.info(f"[PROCESS] Opening inner ZIP {os.path.basename(inner_name)}")
                try:
                    with _open_inner_zip(outer_zip, inner_name) as inner_zip:
                        frames = _read_csvs_from_zip(inner_zip)
                except zipfile.BadZipFile:
                    log.warning(f"[WARN] Skipping {os.path.basename(inner_name)}: not a valid ZIP")
                    continue
                if not frames:
                    log.warning(f"[WARN] No CSVs found in {os.path.basename(inner_name)}")
                    continue
                yield pl.concat(frames, how="diagonal_relaxed")
        else:
            frames = _read_csvs_from_zip(outer_zip)
            if not frames:
                log.warning("[WARN] No CSV files found in ZIP")
                return
            yield pl.concat(frames, how="diagonal_relaxed")

def _clean_rides_data(df: pl.DataFrame) -> pl.DataFrame:
    """Drop rows missing required fields, parse timestamps, drop bad intervals."""
    return (
        df.drop_nulls(subset=_REQUIRED_RIDE_COLS)
        .with_columns(
            pl.col("started_at").str.to_datetime(format="%Y-%m-%d %H:%M:%S%.f", strict=True),
            pl.col("ended_at").str.to_datetime(format="%Y-%m-%d %H:%M:%S%.f", strict=True),
        )
        .drop_nulls(subset=["started_at", "ended_at"])
        .filter(pl.col("ended_at") >= pl.col("started_at"))
    )

def _add_partition_columns(df: pl.DataFrame) -> pl.DataFrame:
    """Add date/year/month/hour/day_of_week/duration columns derived from ended_at.
    Partitioning by ended_at is required since upstream files are organized by end date
    """
    return df.with_columns(
        pl.col("ended_at").dt.date().alias("date"),
        pl.col("ended_at").dt.year().alias("year"),
        pl.col("ended_at").dt.month().alias("month"),
        pl.col("ended_at").dt.hour().alias("hour"),
        (pl.col("ended_at").dt.weekday() - 1).alias("day_of_week"),
        (pl.col("ended_at") - pl.col("started_at"))
            .dt.total_seconds()
            .alias("trip_duration_seconds"),
    )

def _write_month_parquet(df: pl.DataFrame, source_label: str) -> list[tuple[int, int]]:
    """Write `df` as hive-partitioned parquet and return the (year, month) pairs covered."""
    pairs = df.select(["year", "month"]).unique().rows()
    df.write_parquet(
        RIDES_DATA_DIR,
        row_group_size=100_000,
        statistics=True,
        partition_by=["year", "month"],
        compression=PARQUET_COMPRESSION,
    )
    log.info(f"[PROCESS] Wrote {df.height} rows -> {RIDES_DATA_DIR} ({source_label})")
    return pairs

def _process_month(raw_df: pl.DataFrame, source_label: str) -> list[tuple[int, int]]:
    log.info("[PROCESS] Cleaning data...")
    cleaned = _clean_rides_data(raw_df)
    log.info("[PROCESS] Data cleaning complete")
    enriched = _add_partition_columns(cleaned)
    return _write_month_parquet(enriched, source_label)

def download_ride_data(
    start_date: str,
    end_date: str,
    download_jc: bool,
    current_coverage: list[int],
) -> Iterator[tuple[int, int]]:
    """Stream rides from S3, write per-month parquet, yield (year, month) tuples.
    Parameters:
    - start_date, end_date: YYYYMM strings defining the desired date range (inclusive).
    - download_jc: whether to include the "JC-" files with station coordinates.
    - current_coverage: list of YYYYMM integers already covered in the DB, to skip 
        files that are fully covered.
    Yields:
    - (year, month) tuples for each month of data processed.
    """
    # Get all the available files from the S3 bucket and filter them based on parameters
    available = _find_available_files(BASE_URL_RIDE_DATA)
    filtered = _filter_files(available, current_coverage, start_date, end_date, download_jc=download_jc)

    # For each selected file, stream it to disk, process its contents, and yield the covered months
    for file_key in filtered:
        with _stream_zip_to_disk(file_key, BASE_URL_RIDE_DATA) as zip_path:
            for raw_df in _iter_month_frames(zip_path):
                pairs = _process_month(raw_df, source_label=file_key)
                # Drop the loop-bound DataFrame before suspending at the yields
                # below — otherwise it stays alive in the generator frame.
                del raw_df
                yield from pairs
