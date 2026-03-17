from datetime import datetime
import polars as pl
from typing import Union

from config import TEST_DATA_DIR, STATION_DISTANCES_PATH

DistanceFrame = Union[pl.DataFrame, pl.LazyFrame]
_distances_df: DistanceFrame | None = None

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
    if _distances_df is not None:
        return _distances_df

    print("Loading distances data...")
    start_time = datetime.now()

    # TODO: should we implement a test dataset also for distances data?
    if test:
        # If we are in test mode, load the csv file from the committed test dataset
        print("Test mode enabled: loading data from committed test dataset.")
        _distances_df = pl.read_csv(str(TEST_DATA_DIR / "distances.csv"))
    
    else:
        _distances_df = pl.scan_parquet(str(STATION_DISTANCES_PATH))

    end_time = datetime.now()
    print(f"Distances data loaded successfully in {end_time - start_time}.")
    _distances_df = _distances_df.collect() if isinstance(_distances_df, pl.LazyFrame) and inMemory else _distances_df

    print("Final distances data schema:")
    if isinstance(_distances_df, pl.LazyFrame):
        print(_distances_df.collect_schema())
    else:        
        print(_distances_df.dtypes)
    return _distances_df