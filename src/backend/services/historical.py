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
    TODO: Implement any necessary data cleaning and preprocessing steps here, such as:
    - Handling missing values
    - Converting date columns to datetime objects
    - Creating new features (e.g., trip duration, day of week)
    - Filtering out invalid records
    SEE example on how to clean data in the Jupyter notebook for reference.
    """
    return df