import polars as pl
from typing import Union

from src.backend.config import TEST_DATA_DIR, STATION_DISTANCES_PATH
from src.backend.loaders.base_loader import load_cached_frame

DistanceFrame = Union[pl.DataFrame, pl.LazyFrame]
_distances_df: DistanceFrame | None = None

# ONLY CALLED IN TEST MODE TO NORMALIZE TEST DATA TYPES
def _normalize_distances_types(df: DistanceFrame) -> DistanceFrame:
    """Normalize test distances column types to be consistent with production schema."""
    return df.with_columns(
        pl.col("station_id_a").cast(str, strict=False),
        pl.col("station_id_b").cast(str, strict=False),
        pl.col("distance_km").cast(float, strict=False),
    )

def load_distances_data(inMemory=False, test=False) -> DistanceFrame:
    """
    Load all historical distances data from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern
    Parameters:
    - test: if True, load the data from the committed test dataset instead of the full historical data. This is useful for testing and development to avoid loading large datasets.
    - inMemory: if True, collect the LazyFrame into a DataFrame and keep it in memory for faster access on subsequent calls.
    """
    global _distances_df
    # If the data is already loaded and cached, return it directly
    if _distances_df is not None:
        return _distances_df

    _distances_df = load_cached_frame(
        label="distances",
        in_memory=inMemory,
        test=test,
        load_test_data=lambda: pl.read_csv(str(TEST_DATA_DIR / "distances.csv")),
        load_production_data=lambda: pl.scan_parquet(str(STATION_DISTANCES_PATH)),
        normalize_test_data=_normalize_distances_types,
    )

    return _distances_df