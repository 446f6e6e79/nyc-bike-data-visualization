import polars as pl
from datetime import datetime
from pathlib import Path

_weather_df: pl.DataFrame | None = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "data"
WEATHER_DATA_DIR = DATA_DIR / "weather"
TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"

def load_weather_data(test=False) -> pl.DataFrame:
    """
    Load all historical weather data from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern
    """
    global _weather_df
    if _weather_df is not None:
        return _weather_df

    print("Loading weather data...")
    start_time = datetime.now()

    # TODO: should we implement a test dataset also for weather data?
    if test:
        # If we are in test mode, load the csv file from the committed test dataset
        print("Test mode enabled: loading data from committed test dataset.")
        _weather_df = pl.read_csv(str(TEST_DATA_DIR / "weather.csv"))
    
    else:
        # Otherwise, scan all the parquet files
        _weather_df = pl.scan_parquet(str(WEATHER_DATA_DIR / "*.parquet"))

    end_time = datetime.now()
    print(f"Weather data loaded successfully in {end_time - start_time}.")
    return _weather_df