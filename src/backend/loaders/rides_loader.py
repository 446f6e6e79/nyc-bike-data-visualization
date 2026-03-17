import polars as pl
from datetime import datetime
from typing import Union
from config import RIDE_DATA_DIR, TEST_DATA_DIR

RideFrame = Union[pl.DataFrame, pl.LazyFrame]
_rides_df: RideFrame | None = None

def load_ride_data(inMemory: bool=False, test=False) -> RideFrame:
    """
    Load all historical CitiBike trip CSV files from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern

    Parameters:
    - test: if True, load the data from the committed test dataset instead of the full historical data. This is useful for testing and development to avoid loading large datasets.
    - inMemory: if True, collect the LazyFrame into a DataFrame and keep it in memory for faster access on subsequent calls. If False, return a LazyFrame that will be executed on demand.
    """
    global _rides_df
    if _rides_df is not None:
        return _rides_df
    
    print("Loading ride data...")

    if test:
        # If we are in test mode, load the csv file from the committed test dataset
        print("Test mode enabled: loading data from committed test dataset.")
        _rides_df = pl.read_csv(str(TEST_DATA_DIR / "trips.csv"))
    
    else:
        # Otherwise, scan all parquet files recursively from partitioned folders
        _rides_df = pl.scan_parquet(str(RIDE_DATA_DIR / "**/*.parquet"), hive_partitioning=True)
    print("Ride data loaded successfully.")

    print("Cleaning data...")
    time = datetime.now()
    #_rides_df = _clean_data(_rides_df)
    print(f"Data cleaned in {(datetime.now() - time).total_seconds():.2f} seconds.")

    print("Extracting ride features...")
    time = datetime.now()
    #_rides_df = _extract_features(_rides_df)
    print(f"Ride features extracted in {(datetime.now() - time).total_seconds():.2f} seconds.")
    
    print("Final data schema:")
    if isinstance(_rides_df, pl.LazyFrame):
        print(_rides_df.collect_schema())
    else:
        print(_rides_df.schema)

    print("Data loaded and cleaned successfully.")
    # Collect into memory if inMemory is True or if we are in test mode
    _rides_df = _rides_df.collect() if isinstance(_rides_df, pl.LazyFrame) and inMemory else _rides_df
    return _rides_df