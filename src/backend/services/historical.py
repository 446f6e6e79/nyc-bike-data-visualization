import pandas as pd
import os
import requests
from datetime import datetime
from pathlib import Path
from math import radians, cos, sin, asin, sqrt

from models.ride import Weather

"""
    TODO: check for other possible data cleaning steps / feature extraction.
    E.g., check if it is possible to extract the length of the trip from the start and end station coordinates
"""
_df: pd.DataFrame | None = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "data"
TRIP_DATA_DIR = DATA_DIR / "trips"
STATION_DATA_DIR = DATA_DIR / "stations"
TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"

# Environment variable name for configuring the historical data directory
DATA_DIR_ENV_VAR = "HISTORICAL_DATA_DIR"

# Fixed representative coordinates for NYC weather.
NYC_COORDS = (40.7823234, -73.9654161)

def _resolve_data_path(test: bool = False) -> Path:
    """
    Resolve the path to the historical data directory based on the following precedence:
    1. If the environment variable `HISTORICAL_DATA_DIR` is set, use that path
    2. If the `test` flag is True, use the test data directory
    3. Otherwise, use the default data directory
    """
    configured_data_dir = os.getenv(DATA_DIR_ENV_VAR)
    if configured_data_dir:
        return Path(configured_data_dir).expanduser()
    if test:
        return TEST_DATA_DIR
    return TRIP_DATA_DIR

def load_historical_data(test=False) -> pd.DataFrame:
    """
    Load all historical CitiBike trip CSV files from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern
    """
    global _df
    if _df is not None:
        return _df

    print("Loading historical data...")
    # Get the data path based on the environment variable or default location
    data_path = _resolve_data_path(test=test)
    csv_files = list(data_path.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {data_path!r}")

    # Read all CSV files and concatenate them into a single DataFrame
    dfs = [
        pd.read_csv(
            file,
            # Specify data types for station IDs to ensure they are read as strings
            dtype={
                "start_station_id": "string",
                "end_station_id": "string",
            },
        )
        for file in csv_files
    ]
    _df = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(_df)} records from {len(csv_files)} files.")
    
    print("Cleaning data...")
    time = datetime.now()
    _df = _clean_data(_df)
    print(f"Data cleaned in {(datetime.now() - time).total_seconds():.2f} seconds.")
    print("Extracting ride features...")
    time = datetime.now()
    _df = _extract_features(_df)
    print(f"Ride features extracted in {(datetime.now() - time).total_seconds():.2f} seconds.")
    print("Fetching weather data...")
    time = datetime.now()
    _df = enrich_rides_with_weather(_df)
    print(f"Weather data fetched in {(datetime.now() - time).total_seconds():.2f} seconds.")
    print("Data loaded and cleaned successfully.")
    
    return _df

def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Perform basic cleaning on the historical data:
    - Handle missing values by dropping rows with critical missing fields
    - Convert date columns to datetime objects
    """
    # Handle missing values
    df = df.dropna(subset=['start_station_name', 'start_station_id', 'end_station_name', 'end_station_id', 'start_lat', 'start_lng', 'end_lat', 'end_lng', 'member_casual'])
    
    # Convert date columns to datetime
    df['started_at'] = pd.to_datetime(df['started_at'], errors='coerce')
    df['ended_at'] = pd.to_datetime(df['ended_at'], errors='coerce')

    # Drop rows where ended_at is before started_at or where either is missing after conversion
    df = df.dropna(subset=['started_at', 'ended_at'])
    df = df[df['ended_at'] >= df['started_at']]
    return df

def _extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract ride-level features from cleaned historical data:
    - Time-based features (year, month, day of week, hour, day type)
    - Trip duration and distance
    """
    # Extract year, month, day of week, and hour from the start time
    df['start_year'] = df['started_at'].dt.year
    df['start_month'] = df['started_at'].dt.month
    df['start_day_of_week'] = df['started_at'].dt.day_name()
    df['start_hour'] = df['started_at'].dt.hour
    
    # Create a new column for weekday/weekend
    df["day_type"] = df["start_day_of_week"].apply(
        lambda x: "Weekday" if x in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] else "Weekend"
    )
    
    # Create a trip duration column in seconds and filter out trips with non-positive duration
    df['trip_duration'] = (df['ended_at'] - df['started_at']).dt.total_seconds()

    # Create a trip distance column using the Haversine formula
    """
    TODO: check if this is really useful for the analysis, as it might be computationally expensive
    
    Another approach could be to compute it based on the average speed of new yorker cyclists, which is around 15 km/h, and the trip duration.
    This would be a rough estimate, but it might be sufficient for the analysis and much faster to compute.
    """
    df['trip_distance'] = df.apply(lambda row: _haversine_distance(row['start_lat'], row['start_lng'], row['end_lat'], row['end_lng']), axis=1)

    return df

def _haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the Haversine distance between two points on the Earth specified in decimal degrees.
    Returns distance in kilometers.
    
    TODO: analyze possible performance improvement approaches: 
    1) instead of computing the distance for every trip,
       we could compute the distance for each unique pair of start and end stations and then map it back to the trips.

       Also, since it considers the straight line distance between two points, it can be approximated
       to the actual distance traveled along the streets by multiplying it by a factor (e.g., 1.3)
       SEARCH: "Circuity factor for estimating actual travel distance from straight line distance in urban areas"
       circuty_factor = 1.3
       c_f = actual_distance / straight_line_distance --> actual_distance = straight_line_distance * c_f
    
    2) Consider manhattan distance as a simpler alternative to the Haversine distance.
       This is both computationally cheaper and more appropriate for a city like New York with a grid-like street layout.
       Requires for projection of the coordinates to a suitable coordinate reference system 

    3) Also, we could consider caching the computed distances for station pairs to avoid redundant calculations.

    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # delta of latitude coordinates
    d_lon = lon2 - lon1 
    # delta of longitude coordinates
    d_lat = lat2 - lat1 
    
    # Haversine formula
    a = sin(d_lat/2)**2 + cos(lat1) * cos(lat2) * sin(d_lon/2)**2
    c = 2 * asin(sqrt(a)) 
    R = 6371  # Radius of Earth in kilometers
    return c * R

def load_weather_data(min_ride_time: datetime, max_ride_time: datetime) -> dict[str, dict]:
    """
    Load hourly weather data once for the full ride time range.

    The result is cached by inclusive start/end date range and keyed by hour string
    in the format YYYY-MM-DDTHH:00.
    """
    start_date = min_ride_time.date().isoformat()
    end_date = max_ride_time.date().isoformat()

    response = requests.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": NYC_COORDS[0],
            "longitude": NYC_COORDS[1],
            "start_date": start_date,
            "end_date": end_date,
            "hourly": (
                "temperature_2m,"
                "precipitation,"
                "weather_code,"
                "wind_speed_10m"
            ),
            "timezone": "America/New_York",
            "wind_speed_unit": "kmh",
        },
        timeout=(5, 120),
    )
    response.raise_for_status()
    hourly = response.json()["hourly"]

    _weather_by_hour = {}
    for index, hour in enumerate(hourly["time"]):
        weather_code = int(hourly["weather_code"][index])
        weather = Weather(
            time=datetime.fromisoformat(hour),
            temperature=float(hourly["temperature_2m"][index]),
            wind_speed=float(hourly["wind_speed_10m"][index]),
            precipitation=float(hourly["precipitation"][index]),
            weather_code=weather_code,
        )
        _weather_by_hour[hour] = weather.model_dump()

    return _weather_by_hour

def enrich_rides_with_weather(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrich the rides DataFrame with weather data by mapping the start time of 
    each ride to the corresponding hourly weather conditions.
    """
    # Load weather data for the full range of ride start times
    weather_by_hour = load_weather_data(
        df["started_at"].min(),
        df["started_at"].max(),
    )
    hour_keys = df["started_at"].dt.strftime("%Y-%m-%dT%H:00")
    df["weather"] = hour_keys.map(weather_by_hour)

    if df["weather"].isnull().any():
        missing_hours = df[df["weather"].isnull()]["started_at"].dt.strftime("%Y-%m-%dT%H:00").unique()
        print(f"Warning: Missing weather data for the following hours: {missing_hours}")
    return df