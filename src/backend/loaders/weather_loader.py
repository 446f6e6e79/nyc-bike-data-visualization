import polars as pl
from datetime import datetime

from config import TEST_DATA_DIR, WEATHER_DATA_DIR

_weather_df: pl.DataFrame | None = None

#TODO: misses onMemory
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