import polars as pl
from typing import Union

from src.backend.config import TEST_DATA_DIR, WEATHER_DATA_DIR
from src.backend.loaders.base_loader import load_cached_frame

WeatherFrame = Union[pl.DataFrame, pl.LazyFrame]
_weather_df: WeatherFrame | None = None

# ONLY CALLED IN TEST MODE TO NORMALIZE TEST DATA TYPES
def _normalize_weather_types(df: WeatherFrame) -> WeatherFrame:
    """Normalize test weather column types to be consistent with production schema."""
    return df.with_columns(
        pl.col("time").cast(pl.Datetime, strict=False),
        pl.col("temperature").cast(pl.Float64, strict=False),
        pl.col("wind_speed").cast(pl.Float64, strict=False),
        pl.col("precipitation").cast(pl.Float64, strict=False),
        pl.col("weather_code").cast(pl.Int64, strict=False),
    )

def load_weather_data(inMemory: bool = False, test: bool = False) -> WeatherFrame:
    """
    Load all historical weather data from the given directory into
    a single WeatherFrame. The result is cached in memory after the first call using
    a singleton pattern
    """
    global _weather_df
    # If the data is already loaded and cached, return it directly
    if _weather_df is not None:
        return _weather_df

    _weather_df = load_cached_frame(
        label="weather",
        in_memory=inMemory,
        test=test,
        load_test_data=lambda: pl.read_csv(str(TEST_DATA_DIR / "weather.csv")),
        load_production_data=lambda: pl.scan_parquet(
            str(WEATHER_DATA_DIR / "**/*.parquet"), hive_partitioning=True
        ),
        normalize_test_data=_normalize_weather_types,
    )

    return _weather_df