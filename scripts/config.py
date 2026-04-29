import os
from pathlib import Path
from datetime import datetime, timedelta

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Data directories
DATA_DIR               = PROJECT_ROOT / "data"
RIDES_DATA_DIR         = DATA_DIR / "rides"
WEATHER_DATA_DIR       = DATA_DIR / "weather"
STATION_DATA_DIR       = DATA_DIR / "stations"
STATION_DISTANCES_PATH = STATION_DATA_DIR / "station_pair_distances.parquet"
BIKE_ROUTES_DATA_DIR   = DATA_DIR / "bike_routes"
BIKE_ROUTES_PATH       = BIKE_ROUTES_DATA_DIR / "bike_routes.parquet"
DAILY_STATS_DATA_DIR   = DATA_DIR / "daily_stats"
DAILY_STATS_PATH       = DAILY_STATS_DATA_DIR / "daily_stats.parquet"

# Download URLs
BASE_URL_RIDE_DATA = "https://s3.amazonaws.com/tripdata/"
WEATHER_API_URL    = "https://archive-api.open-meteo.com/v1/archive"
BIKE_ROUTES_URL    = "https://data.cityofnewyork.us/api/views/mzxg-pwib/rows.csv?accessType=DOWNLOAD"

# Default date range for data ingestion
DEFAULT_START_DATE = "202001"
_one_month_ago     = datetime.now() - timedelta(days=30)
DEFAULT_END_DATE   = _one_month_ago.strftime("%Y%m")
DOWNLOAD_JC        = False
# Months processed concurrently by the outer pool. Default 1 keeps the seeder safe
# on small CI runners (e.g. ubuntu-latest, 2 vCPU / 7 GB shared with postgres).
# Override via PARALLEL_MONTHS env var on machines with more headroom.
PARALLEL_MONTHS    = int(os.getenv("PARALLEL_MONTHS", "1"))
# Inner pool size for the per-month DB inserts. Each worker holds the rides frame
# plus its aggregation intermediates, so this multiplies memory pressure.
DB_LOADER_WORKERS  = int(os.getenv("DB_LOADER_WORKERS", "2"))

# Data processing constants
YEARLY_CUTOFF         = 2023   # Files with only a year <= this are assumed to cover the full year
PARQUET_COMPRESSION   = "zstd"
STREET_CIRCUITY_FACTOR = 1.3

# Weather retrieval settings
NYC_COORDS       = (40.7823234, -73.9654161)
WEATHER_TIMEZONE = "America/New_York"
