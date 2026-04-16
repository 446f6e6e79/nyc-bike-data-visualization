import polars as pl
from datetime import date
from src.backend.config import DAILY_STATS_PATH


def load_daily_stats(start_date: date, end_date: date) -> pl.LazyFrame:
    """Load precomputed daily stats filtered to [start_date, end_date]."""
    return (
        pl.scan_parquet(DAILY_STATS_PATH)
        .filter(
            (pl.col("date") >= start_date) &
            (pl.col("date") <= end_date)
        )
    )
