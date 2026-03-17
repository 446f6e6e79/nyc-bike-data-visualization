import io
import os
import requests
import zipfile
import polars as pl
from utils.config import PARQUET_COMPRESSION, YEARLY_CUTOFF

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

def clean_rides_data(df: pl.DataFrame) -> pl.DataFrame:
    """
    Perform basic cleaning on the historical data:
    - Handle missing values by dropping rows with critical missing fields
    - Convert date columns to datetime objects
    """
    # Drop rows missing critical fields
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
            pl.col("started_at").cast(pl.Utf8).str.strptime(pl.Datetime, strict=False),
            pl.col("ended_at").cast(pl.Utf8).str.strptime(pl.Datetime, strict=False),
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
        print("Starting data cleaning...")
        clean_rides_data(trip_data)
        print("Data cleaning completed.")
        # Write the combined DataFrame to a parquet file, partitioned by year and month
        trip_data.write_parquet(
            output_dir,
            row_group_size=100_000,   # smaller = faster predicate pushdown
            statistics=True,           # enables min/max skipping
            partition_by=["year", "month"],
            compression=PARQUET_COMPRESSION)
        
        print(f"Wrote {trip_data.height} rows to {output_dir} for file {f}")

