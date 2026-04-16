import polars as pl
import calendar
from datetime import date
from src.backend.config import DAILY_STATS_DATA_DIR, DAILY_STATS_PATH, PARQUET_COMPRESSION, RIDES_DATA_DIR
from src.backend.services.rides import get_filtered_rides, add_trip_duration
from src.backend.loaders.rides_loader import list_rides_months_partitions

def compute_and_save_daily_stats() -> None:
    """
    Precompute per-day aggregated stats over all downloaded rides and write to parquet.
    Stats are computed without any user/bike-type filtering (overall totals only).
    The output file is read by the backend when group_by=date is requested.
    """
    month_partitions = list_rides_months_partitions(RIDES_DATA_DIR)
    if not month_partitions:
        print("No ride data found — skipping daily stats precomputation.")
        return

    monthly_frames = []
    for year, month in month_partitions:
        # Get the last day of the month to use as the end date for filtering rides
        last_day = calendar.monthrange(year, month)[1]
        start = date(year, month, 1)
        end = date(year, month, last_day)

        # Get the filtered rides for the month with distances joined, add trip duration, and compute daily aggregates
        rides_lf = add_trip_duration(
            get_filtered_rides(join_distances=True, start_date=start, end_date=end)
        )
        daily_month = (
            rides_lf
            .with_columns(pl.col("started_at").dt.date().alias("date"))
            .group_by("date")
            .agg([
                pl.len().alias("total_rides"),
                pl.col("trip_duration_seconds").mean().alias("average_duration_seconds"),
                pl.col("distance_km").mean().alias("average_distance_km"),
                pl.col("trip_duration_seconds").sum().alias("total_duration_seconds"),
                pl.col("distance_km").sum().alias("total_distance_km"),
                (
                    pl.when(pl.col("trip_duration_seconds").sum() > 0)
                    .then(
                        pl.col("distance_km").sum()
                        / (pl.col("trip_duration_seconds").sum() / 3600)
                    )
                    .otherwise(0.0)
                    .alias("average_speed_kmh")
                ),
            ])
            .with_columns(pl.lit(24).cast(pl.Int64).alias("hours_count"))
            .collect()
        )
        monthly_frames.append(daily_month)

    daily = pl.concat(monthly_frames).sort("date")
    DAILY_STATS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    daily.write_parquet(DAILY_STATS_PATH, compression=PARQUET_COMPRESSION)
    print(f"Saved daily stats: {len(daily)} days -> {DAILY_STATS_PATH}")
