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
    return _df
