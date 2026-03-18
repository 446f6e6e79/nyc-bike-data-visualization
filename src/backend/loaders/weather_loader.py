import polars as pl
from datetime import datetime
from typing import Union

from src.backend.config import TEST_DATA_DIR, WEATHER_DATA_DIR

WeatherFrame = Union[pl.DataFrame, pl.LazyFrame]
_weather_df: WeatherFrame | None = None

def load_weather_data(inMemory: bool = False, test: bool = False) -> WeatherFrame:
    """
    Load all historical weather data from the given directory into
    a single WeatherFrame. The result is cached in memory after the first call using
    a singleton pattern
    """
    global _weather_df
    if _weather_df is not None:
        return _weather_df

    print("Loading weather data...")
    start_time = datetime.now()

    if test:
        # If we are in test mode, load the csv file from the committed test dataset
        print("Test mode enabled: loading data from committed test dataset.")
        _weather_df = pl.read_csv(str(TEST_DATA_DIR / "weather.csv"))
    
    else:
        # Otherwise, scan all the parquet files
        _weather_df = pl.scan_parquet(str(WEATHER_DATA_DIR / "**/*.parquet"), hive_partitioning=True)

    end_time = datetime.now()
    print(f"Weather data loaded successfully in {end_time - start_time}.")
    # If inMemory is True or in test mode, collect the LazyFrame into a DataFrame and keep it in memory for faster access on subsequent calls
    _weather_df = _weather_df.collect() if isinstance(_weather_df, pl.LazyFrame) and inMemory else _weather_df

    print("Final weather data schema:")
    if isinstance(_weather_df, pl.LazyFrame):
        print(_weather_df.collect_schema())
    else:        
        print(_weather_df.dtypes)
    return _weather_df