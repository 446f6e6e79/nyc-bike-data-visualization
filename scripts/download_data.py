"""
    Script to download and merge the bike-sharing trip data from the S3 bucket.
    The script will filter files by date range and dataset type (JC or non-JC)
    and extract the CSV files from the downloaded ZIP files into a specified directory.
"""
import argparse
import re
import requests
import xml.etree.ElementTree as ET
import os
import io
import zipfile

BASE_DATA_URL = "https://s3.amazonaws.com/tripdata/"
DOWNLOAD_DIR = "data/"
TRIP_DATA_DIR = os.path.join(DOWNLOAD_DIR, "trips")

# Filter files by date range (MUST BE IN THE FORMAT YYYYMM)
DEFAULT_START_DATE = "202601"
DEFAULT_END_DATE = ""

# Set to True to also download files from the JC dataset
DOWNLOAD_JC = False
YEARLY_CUTOFF = 2023

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

def download_and_extract_files(filtered_files: list, base_data_url: str, download_dir: str):
    """
    Download and extract the filtered files from the S3 bucket.
    Args:
        filtered_files (list): The list of file keys to download and extract.
        base_data_url (str): The base URL of the S3 bucket.
        download_dir (str): The directory to save the extracted CSV files.
    """
    for f in filtered_files:
        print(f"Downloading {f}...")
        response = requests.get(base_data_url + f)
        response.raise_for_status()
        print(f"Finished downloading {f}, extracting...")
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            for name in zip_file.namelist():
                if not name.endswith(".csv"):
                    continue

                output_name = os.path.basename(name)
                output_path = os.path.join(download_dir, output_name)

                print(f"Extracting {output_name}...")
                with zip_file.open(name) as source, open(output_path, "wb") as target:
                    target.write(source.read())
        print(f"Finished extracting {f}")

def parse_args() -> argparse.Namespace:
    """
    Parse command-line arguments for the script.
    Returns:
        argparse.Namespace: The parsed command-line arguments.
    """
    parser = argparse.ArgumentParser(description="Download and extract Citi Bike tripdata files")
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

    # Find all files in the S3 bucket
    files = find_files(BASE_DATA_URL)

    # Filter files by date range and dataset type
    filtered_files = filter_files(files, args.start_date, args.end_date, args.download_jc)

    # Download and extract the filtered files
    download_and_extract_files(filtered_files, BASE_DATA_URL, TRIP_DATA_DIR)

if __name__ == "__main__":
    main()