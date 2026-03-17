import polars as pl
from datetime import datetime
from pathlib import Path

_distances_df: pl.DataFrame | None = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "data"
DISTANCES_DATA_DIR = DATA_DIR / "distances"
TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"

def load_distances_data(test=False) -> pl.DataFrame:
    """
    Load all historical distances data from the given directory into
    a single DataFrame. The result is cached in memory after the first call using
    a singleton pattern
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
        # Otherwise, scan all the parquet files
        _distances_df = pl.scan_parquet(str(DISTANCES_DATA_DIR / "*.parquet"))

    end_time = datetime.now()
    print(f"Distances data loaded successfully in {end_time - start_time}.")
    return _distances_df