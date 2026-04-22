from pathlib import Path
import logging
from datetime import datetime, timedelta

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parent

# Base URL for the S3 bucket containing the ride data files
BASE_URL_RIDE_DATA = "https://s3.amazonaws.com/tripdata/"
WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/archive"

# URL for downloading bike route data from NYC Open Data
BIKE_ROUTES_URL = "https://data.cityofnewyork.us/api/views/mzxg-pwib/rows.csv?accessType=DOWNLOAD"

# URLs provided by Lyft's GBFS feed
INFO_URL = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_information.json"
STATUS_URL = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json"

# Cache settings for GBFS data
TTL_SECONDS = 60  # Cache time-to-live in seconds
# Note: The GBFS feed provides a "vehicle_types_available" field which is a list of dicts containing bike counts by type. 
# Each dict has a "vehicle_type_id" (e.g. "1" for classic bikes, "2" for e-bikes) and a "count".
GBFS_CLASSIC_BIKE_TYPE_ID = "1"
GBFS_EBIKE_TYPE_ID = "2"

# Path to directories and files
DATA_DIR = PROJECT_ROOT / "data"
RIDES_DATA_DIR = DATA_DIR / "rides"             # Directory for processed ride data
WEATHER_DATA_DIR = DATA_DIR / "weather"         # Directory for processed weather data
STATION_DATA_DIR = DATA_DIR / "stations"        # Directory for precomputed station-pair distances
STATION_DISTANCES_PATH = STATION_DATA_DIR / "station_pair_distances.parquet"
BIKE_ROUTES_DATA_DIR = DATA_DIR / "bike_routes" # Directory for preprocessed bike route data
BIKE_ROUTES_PATH = BIKE_ROUTES_DATA_DIR / "bike_routes.parquet"
DAILY_STATS_DATA_DIR = DATA_DIR / "daily_stats"  # Directory for precomputed daily stats
DAILY_STATS_PATH = DAILY_STATS_DATA_DIR / "daily_stats.parquet"

# Setting for weather data retrieval
NYC_COORDS = (40.7823234, -73.9654161)
WEATHER_TIMEZONE = "America/New_York"

# Default parameters for data processing and retrieval
DEFAULT_START_DATE = "202601"
# The default end date is set to the YYYYMM of the previous month
one_month_ago = datetime.now() - timedelta(days=30)
DEFAULT_END_DATE = one_month_ago.strftime("%Y%m")
DOWNLOAD_JC = False
YEARLY_CUTOFF = 2023        # If a file name contains only a year <= this cutoff, we assume it covers the entire year
PARQUET_COMPRESSION = "zstd"
STREET_CIRCUITY_FACTOR = 1.3

TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"

# Specify whether all data should be loaded into memory at startup for faster access, or loaded on demand with potential performance trade-offs
IN_MEMORY_CACHE_ENABLED = False

# Log file settings
LOG_FILE_PATH = "logs/requests.log"
LOG_LEVEL = logging.INFO            # To disable logging, set to logging.CRITICAL or higher