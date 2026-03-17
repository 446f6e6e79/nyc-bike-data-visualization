'''
This module contains configuration constants for the data processing pipeline, including URLs, directory paths, and other settings.
'''
import os

BASE_DATA_URL = "https://s3.amazonaws.com/tripdata/"
DOWNLOAD_DIR = "data/"

RIDES_DATA_DIR = os.path.join(DOWNLOAD_DIR, "rides/")
STATION_DATA_DIR = os.path.join(DOWNLOAD_DIR, "stations/")
STATION_DISTANCES_PATH = os.path.join(STATION_DATA_DIR, "station_pair_distances.parquet")
WEATHER_DATA_DIR = os.path.join(DOWNLOAD_DIR, "weather/")

WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/archive"
NYC_COORDS = (40.7823234, -73.9654161) # Fixed coordinates for Central Park, NYC
WEATHER_TIMEZONE = "America/New_York"

# Filter files by date range (MUST BE IN THE FORMAT YYYYMM)
DEFAULT_START_DATE = "202601"
DEFAULT_END_DATE = ""

# Set to True to also download files from the JC dataset
DOWNLOAD_JC = False
YEARLY_CUTOFF = 2023
PARQUET_COMPRESSION = "zstd"
STREET_CIRCUITY_FACTOR = 1.3
