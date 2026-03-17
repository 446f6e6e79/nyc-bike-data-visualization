import polars as pl
from models.stats import DailyStats, RideTypeStats, Stats, UserTypeStats
from models.ride import RideableType, MemberCasual
from services.rides import RideFrame
from services.distances import DistanceFrame

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper function to collect a LazyFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

def _to_float(value: float | None) -> float:
    return float(value) if value is not None else 0.0

def _enrich_with_trip_distance(rides: RideFrame, distances: DistanceFrame) -> pl.LazyFrame:
    """Enrich the rides DataFrame with trip distance by joining with the distances DataFrame."""
    # Normalize station pairs in rides to match the format in distances (station_id_a < station_id_b)
    rides_norm = rides.with_columns([
        pl.min_horizontal("start_station_id", "end_station_id").alias("station_id_a"),
        pl.max_horizontal("start_station_id", "end_station_id").alias("station_id_b"),
    ])

    enriched = rides_norm.join(
        distances,
        on=["station_id_a", "station_id_b"],
        how="left",
    )

    enriched = enriched.with_columns(
        pl.col("distance_km").fill_null(0.0)
    )
    return enriched

def _compute_base_stats(rides: RideFrame, distances: DistanceFrame, year: int=2026) -> Stats:
    print(f"Filtering for year {year}...")
    if year:
        rides = rides.filter(pl.col('start_year') == year)
    print(f"Filtered")
    print("Enriching with trip distance...")
    rides_with_distance = _enrich_with_trip_distance(rides, distances)
    print("Enriched with trip distance.")

    print("Aggregating statistics...")
    aggregated = rides_with_distance.select(
        pl.len().alias("total_rides"),
        pl.col("trip_duration").mean().alias("average_duration_seconds"),
        pl.col("distance_km").mean().alias("average_distance_km"),
        pl.col("trip_duration").sum().alias("total_duration_seconds"),
        pl.col("distance_km").sum().alias("total_distance_km"),
    )
    print("Aggregated statistics.")
    print("Collecting results...")
    row = _collect_if_lazy(aggregated).row(0, named=True)
    print("Collected results.")
    return Stats(
        total_rides=int(row["total_rides"]),
        average_duration_seconds=_to_float(row["average_duration_seconds"]),
        average_distance_km=_to_float(row["average_distance_km"]),
        total_duration_seconds=_to_float(row["total_duration_seconds"]),
        total_distance_km=_to_float(row["total_distance_km"]),
    )


def compute_all_ride_type_stats(rides_df: RideFrame, distances_df: DistanceFrame) -> list[RideTypeStats]:
    """Compute statistics for all rideable types"""
    return [compute_ride_type_stats(rides_df, distances_df, rideable_type) for rideable_type in RideableType]


def compute_ride_type_stats(rides_df: RideFrame, distances_df: DistanceFrame, rideable_type: RideableType) -> RideTypeStats:
    """Compute statistics for a specific rideable type"""
    rides = rides_df.filter(pl.col("rideable_type") == rideable_type.value)
    return RideTypeStats(
        rideable_type=rideable_type,
        stats=_compute_base_stats(rides, distances_df)
    )


def compute_all_user_type_stats(rides_df: RideFrame, distances_df: DistanceFrame) -> list[UserTypeStats]:
    """Compute statistics for all user types"""
    return [compute_user_type_stats(rides_df, distances_df, user_type) for user_type in MemberCasual]


def compute_user_type_stats(rides_df: RideFrame, distances_df: DistanceFrame, user_type: MemberCasual) -> UserTypeStats:
    """Compute statistics for a specific user type"""
    rides = rides_df.filter(pl.col("member_casual") == user_type.value)
    return UserTypeStats(
        user_type=user_type,
        stats=_compute_base_stats(rides, distances_df)
    )


def compute_daily_stats(rides_df: RideFrame, distances_df: DistanceFrame) -> list[DailyStats]:
    """Compute statistics for each day of the week."""
    rides_with_distance = _enrich_with_trip_distance(rides_df, distances_df)
    aggregated = (
        rides_with_distance.group_by("start_day_of_week")
        .agg(
            pl.len().alias("total_rides"),
            pl.col("trip_duration").mean().alias("average_duration_seconds"),
            pl.col("distance_km").mean().alias("average_distance_km"),
            pl.col("trip_duration").sum().alias("total_duration_seconds"),
            pl.col("distance_km").sum().alias("total_distance_km"),
        )
        .sort("start_day_of_week")
    )

    daily_stats_df = _collect_if_lazy(aggregated)
    return [
        DailyStats(
            day_of_week=row["start_day_of_week"],
            stats=Stats(
                total_rides=int(row["total_rides"]),
                average_duration_seconds=_to_float(row["average_duration_seconds"]),
                average_distance_km=_to_float(row["average_distance_km"]),
                total_duration_seconds=_to_float(row["total_duration_seconds"]),
                total_distance_km=_to_float(row["total_distance_km"]),
            ),
        )
        for row in daily_stats_df.iter_rows(named=True)
    ]