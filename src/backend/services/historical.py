import pandas as pd
from pathlib import Path

_df: pd.DataFrame | None = None
DATA_DIR = "../../data/"

def load_historical_data() -> pd.DataFrame:
    """
    Load all historical CitiBike trip CSV files from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern
    """
    global _df
    if _df is not None:
        return _df

    print("Loading historical data...")
    csv_files = list(Path(DATA_DIR).glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {DATA_DIR!r}")

    dfs = [pd.read_csv(file) for file in csv_files]
    _df = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(_df)} records from {len(csv_files)} files.")
    
    print("Cleaning data...")
    _df = _clean_data(_df)
    print("Data loaded and cleaned successfully.")
    
    return _df

def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Perform basic cleaning on the historical data:
    - Handle missing values by dropping rows with critical missing fields
    - Convert date columns to datetime objects
    - Extract useful features like year, month, day of week, and hour from the start time
    - Create a trip duration column and filter out trips with non-positive duration
    """
    # Handle missing values
    df = df.dropna(subset=['start_station_name', 'start_station_id', 'end_station_name', 'end_station_id', 'start_lat', 'start_lng', 'end_lat', 'end_lng', 'member_casual'])

    # Convert date columns to datetime
    df['started_at'] = pd.to_datetime(df['started_at'], errors='coerce')
    df['ended_at'] = pd.to_datetime(df['ended_at'], errors='coerce')
    
    # Extract year, month, day of week, and hour from the start time
    df['start_year'] = df['started_at'].dt.year
    df['start_month'] = df['started_at'].dt.month
    df['start_day_of_week'] = df['started_at'].dt.dayofweek
    df['start_hour'] = df['started_at'].dt.hour
    
    # Create a trip duration column in seconds and filter out trips with non-positive duration
    df['trip_duration'] = (df['ended_at'] - df['started_at']).dt.total_seconds()
    df = df[df['trip_duration'] > 0]

    return df