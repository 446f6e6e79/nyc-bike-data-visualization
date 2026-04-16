import polars as pl
from src.backend.config import DAILY_STATS_DATA_DIR, DAILY_STATS_PATH, PARQUET_COMPRESSION
from src.backend.services.rides import get_filtered_rides, add_trip_duration


def compute_and_save_daily_stats() -> None:
    """
    Precompute per-day aggregated stats over all downloaded rides and write to parquet.
    Stats are computed without any user/bike-type filtering (overall totals only).
    The output file is read by the backend when group_by=date is requested.
    """
    #TODO: read in months chunks to avoid loading all rides into memory at once if the dataset grows too large
    rides_lf = add_trip_duration(get_filtered_rides(join_distances=True))

    daily = (
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
        .sort("date")
        .collect()
    )

    DAILY_STATS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    daily.write_parquet(DAILY_STATS_PATH, compression=PARQUET_COMPRESSION)
    print(f"Saved daily stats: {len(daily)} days → {DAILY_STATS_PATH}")
