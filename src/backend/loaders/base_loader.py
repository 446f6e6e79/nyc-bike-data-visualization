from datetime import datetime
from typing import Callable
import polars as pl

"""
Define a type alias for a DataFrame or LazyFrame to allow flexible return types from the load_cached_frame function.
This enables to return a LazyFrame for production data (for deferred execution and better performance) while still allowing test data to be loaded as a DataFrame for easier manipulation and testing.
"""
LoaderFrame = pl.DataFrame | pl.LazyFrame


def _format_schema(schema: pl.Schema) -> str:
    """Helper function to format a Polars schema dictionary into a readable string for logging purposes."""
    return "\n".join(f"  - {name}: {dtype}" for name, dtype in schema.items())

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
    print(f"[{label}] Loading data...")
    start_time = datetime.now()

    # If we are in test mode, load the committed test dataset as a DataFrame
    if test:
        print(f"[{label}] Test mode: loading committed test dataset")
        frame: LoaderFrame = load_test_data()
        # The function to normalize test data must be provided in test mode
        if normalize_test_data is None:
            raise ValueError("normalize_test_data function must be provided when loading test data to ensure consistent schemas and avoid mixed-type errors.")
        frame = normalize_test_data(frame)

    else:
        # If in production mode, load the data as a LazyFrame
        frame = load_production_data()

    end_time = datetime.now()
    elapsed_seconds = (end_time - start_time).total_seconds()
    print(f"[{label}] Loaded successfully in {elapsed_seconds:.2f}s")

    if isinstance(frame, pl.LazyFrame) and in_memory:
        print(f"[{label}] Collecting LazyFrame into memory")
        frame = frame.collect()

    print(f"[{label}] Final schema:")
    if isinstance(frame, pl.LazyFrame):
        print(_format_schema(frame.collect_schema()))
    else:
        print(_format_schema(frame.schema))
    return frame