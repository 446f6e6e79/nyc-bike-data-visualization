from datetime import datetime
from typing import Callable
import polars as pl

"""
Define a type alias for a DataFrame or LazyFrame to allow flexible return types from the load_cached_frame function.
This enables to return a LazyFrame for production data (for deferred execution and better performance) while still allowing test data to be loaded as a DataFrame for easier manipulation and testing.
"""
LoaderFrame = pl.DataFrame | pl.LazyFrame

def load_cached_frame(
    *,
    label: str,              # A label for logging purposes (e.g., "ride", "weather", "distances")
    in_memory: bool,         # Whether to collect a LazyFrame into memory as a DataFrame for faster access on subsequent calls
    test: bool,              # Whether to load test data (from a committed CSV) or production data (from Parquet files)
    load_test_data: Callable[[], pl.DataFrame],
    load_production_data: Callable[[], pl.LazyFrame],
    normalize_test_data: Callable[[pl.DataFrame], LoaderFrame] | None = None,   # Optional function to normalize test data types to match production schema
) -> LoaderFrame:
    """Load a DataFrame/LazyFrame with shared test/prod and collection behavior."""
    print(f"Loading {label} data...")
    start_time = datetime.now()

    if test:
        print("Test mode enabled: loading data from committed test dataset.")
        frame: LoaderFrame = load_test_data()
        if normalize_test_data is None:
            raise ValueError("normalize_test_data function must be provided when loading test data to ensure consistent schemas and avoid mixed-type errors.")
        frame = normalize_test_data(frame)

    else:
        # If in production mode, load the data as a LazyFrame
        frame = load_production_data()

    end_time = datetime.now()
    print(f"{label.capitalize()} data loaded successfully in {end_time - start_time}.")

    if isinstance(frame, pl.LazyFrame) and in_memory:
        frame = frame.collect()

    print(f"Final {label} data schema:")
    if isinstance(frame, pl.LazyFrame):
        print(frame.collect_schema())
    else:
        print(frame.dtypes)
    return frame