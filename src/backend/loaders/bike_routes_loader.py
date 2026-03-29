import polars as pl
from typing import Union


from src.backend.config import TEST_DATA_DIR, BIKE_ROUTES_PATH
from src.backend.loaders.base_loader import load_cached_frame

BikeRoutesFrame = Union[pl.DataFrame, pl.LazyFrame]
_bike_routes_df: BikeRoutesFrame | None = None

# ONLY CALLED IN TEST MODE TO NORMALIZE TEST DATA TYPES
def _normalize_bike_routes_types(df: BikeRoutesFrame) -> BikeRoutesFrame:
    """Normalize test bike routes column types to be consistent with production schema."""
    # TODO: implement if needed after test data is added
    return df

def load_bike_routes_data(inMemory=False, test=False) -> BikeRoutesFrame:
    """
    Load all historical bike routes data from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern
    Parameters:
    - test: if True, load the data from the committed test dataset instead of the full historical data. This is useful for testing and development to avoid loading large datasets.
    - inMemory: if True, collect the LazyFrame into a DataFrame and keep it in memory for faster access on subsequent calls.
    """
    global _bike_routes_df
    # If the data is already loaded and cached, return it directly
    if _bike_routes_df is not None:
        return _bike_routes_df

    _bike_routes_df = load_cached_frame(
        label="bike_routes",
        in_memory=inMemory,
        test=test,
        load_test_data=lambda: pl.read_csv(str(TEST_DATA_DIR / "bike_routes.csv")),
        load_production_data=lambda: pl.scan_parquet(str(BIKE_ROUTES_PATH)),
        normalize_test_data=_normalize_bike_routes_types,
    )

    return _bike_routes_df