from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parent

BASE_DATA_URL = "https://s3.amazonaws.com/tripdata/"

DATA_DIR = PROJECT_ROOT / "data"
DOWNLOAD_DIR = DATA_DIR

RIDES_DATA_DIR = DATA_DIR / "rides"
RIDE_DATA_DIR = RIDES_DATA_DIR
STATION_DATA_DIR = DATA_DIR / "stations"
STATION_DISTANCES_PATH = STATION_DATA_DIR / "station_pair_distances.parquet"
WEATHER_DATA_DIR = DATA_DIR / "weather"

WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/archive"
NYC_COORDS = (40.7823234, -73.9654161)
WEATHER_TIMEZONE = "America/New_York"

DEFAULT_START_DATE = "202601"
DEFAULT_END_DATE = ""
DOWNLOAD_JC = False
YEARLY_CUTOFF = 2023
PARQUET_COMPRESSION = "zstd"
STREET_CIRCUITY_FACTOR = 1.3

TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"
