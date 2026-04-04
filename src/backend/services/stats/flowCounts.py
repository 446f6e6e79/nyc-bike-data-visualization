import polars as pl
from datetime import date
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    GroupedTripsCountBetweenStations,
    RideCountGroupBy,
    TripsCountBetweenStations,
)
from src.backend.services.stats.utils import (
    to_lazy,
    build_time_dimension,
    attach_hours_count,
    hours_count_from_time_dimension,
)
from src.backend.services.rides import get_filtered_rides

def get_trips_between_stations_stats(
    start_date: date,
    end_date: date,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    group_by: RideCountGroupBy = RideCountGroupBy.NONE,
    limit: int = 100,
) -> list[TripsCountBetweenStations]:
    rides = to_lazy(get_filtered_rides(start_date=start_date, end_date=end_date, user_type=user_type, bike_type=bike_type))

    if station_id:
        rides = rides.filter(
            (pl.col("start_station_id") == station_id)
            | (pl.col("end_station_id") == station_id)
        )

    day_expr = (pl.col("started_at").dt.weekday() - 1).alias("day_of_week")
    hour_expr = pl.col("started_at").dt.hour().alias("hour")

    group_exprs: list[pl.Expr] = []
    group_cols: list[str] = []

    if group_by == RideCountGroupBy.DAY_OF_WEEK:
        group_exprs = [day_expr]
        group_cols = ["day_of_week"]
    elif group_by == RideCountGroupBy.HOUR:
        group_exprs = [hour_expr]
        group_cols = ["hour"]
    elif group_by == RideCountGroupBy.DAY_OF_WEEK_AND_HOUR:
        group_exprs = [day_expr, hour_expr]
        group_cols = ["day_of_week", "hour"]

    directional_counts = (
        rides.group_by([*group_exprs, "start_station_id", "end_station_id"])
        .agg([
            pl.len().alias("ride_count"),
            pl.first("start_station_name").alias("start_station_name"),
            pl.first("end_station_name").alias("end_station_name"),
            pl.first("start_lat").alias("start_lat"),
            pl.first("start_lng").alias("start_lon"),
            pl.first("end_lat").alias("end_lat"),
            pl.first("end_lng").alias("end_lon"),
        ])
    )

    directional_counts = directional_counts.with_columns([
        pl.when(pl.col("start_station_id") <= pl.col("end_station_id"))
        .then(
            pl.concat_str(
                [pl.col("start_station_id"), pl.col("end_station_id")],
                separator="<->",
            )
        )
        .otherwise(
            pl.concat_str(
                [pl.col("end_station_id"), pl.col("start_station_id")],
                separator="<->",
            )
        )
        .alias("pair_id"),
        (pl.col("start_station_id") <= pl.col("end_station_id")).alias("is_forward"),
    ])
    
    # Collect here to avoid having to do double scans of the rides data when we split into forward and reverse counts later
    directional_counts = directional_counts.collect()

    forward_counts = directional_counts.filter(pl.col("is_forward")).select([
        *group_cols,
        "pair_id",
        pl.col("start_station_id").alias("station_a_id"),
        pl.col("start_station_name").alias("station_a_name"),
        pl.col("start_lat").alias("station_a_lat"),
        pl.col("start_lon").alias("station_a_lon"),
        pl.col("end_station_id").alias("station_b_id"),
        pl.col("end_station_name").alias("station_b_name"),
        pl.col("end_lat").alias("station_b_lat"),
        pl.col("end_lon").alias("station_b_lon"),
        pl.col("ride_count").alias("a_to_b_count"),
    ])

    reverse_counts = directional_counts.filter(~pl.col("is_forward")).select([
        *group_cols,
        "pair_id",
        pl.col("end_station_id").alias("station_a_id"),
        pl.col("end_station_name").alias("station_a_name"),
        pl.col("end_lat").alias("station_a_lat"),
        pl.col("end_lon").alias("station_a_lon"),
        pl.col("start_station_id").alias("station_b_id"),
        pl.col("start_station_name").alias("station_b_name"),
        pl.col("start_lat").alias("station_b_lat"),
        pl.col("start_lon").alias("station_b_lon"),
        pl.col("ride_count").alias("b_to_a_count"),
    ])

    paired_counts = forward_counts.join(
        reverse_counts,
        on=[*group_cols, "pair_id"] if group_cols else ["pair_id"],
        how="full",
        suffix="_right",
    ).select([
        *[
            pl.coalesce(col, f"{col}_right").alias(col)
            for col in group_cols
        ],
        pl.coalesce("pair_id", "pair_id_right").alias("pair_id"),
        pl.coalesce("station_a_id", "station_a_id_right").alias("station_a_id"),
        pl.coalesce("station_a_name", "station_a_name_right").alias("station_a_name"),
        pl.coalesce("station_a_lat", "station_a_lat_right").alias("station_a_lat"),
        pl.coalesce("station_a_lon", "station_a_lon_right").alias("station_a_lon"),
        pl.coalesce("station_b_id", "station_b_id_right").alias("station_b_id"),
        pl.coalesce("station_b_name", "station_b_name_right").alias("station_b_name"),
        pl.coalesce("station_b_lat", "station_b_lat_right").alias("station_b_lat"),
        pl.coalesce("station_b_lon", "station_b_lon_right").alias("station_b_lon"),
        pl.col("a_to_b_count").fill_null(0),
        pl.col("b_to_a_count").fill_null(0),
    ])

    paired_counts = paired_counts.with_columns(
        (pl.col("a_to_b_count") + pl.col("b_to_a_count")).alias("total_rides")
    )

    time_base = build_time_dimension(start_date, end_date, base_for_group_by=group_by)
    if group_cols:
        paired_counts = (
            time_base.lazy()
            .join(paired_counts, on=group_cols, how="left")
            .with_columns([
                pl.col("a_to_b_count").fill_null(0),
                pl.col("b_to_a_count").fill_null(0),
                pl.col("total_rides").fill_null(0),
            ])
        )

    if group_cols:
        paired_counts = attach_hours_count(
            paired_counts,
            group_cols,
            start_date,
            end_date,
            group_by,
        )
    else:
        hours_count = int(
            hours_count_from_time_dimension(start_date, end_date, RideCountGroupBy.NONE)
            .item(0, "hours_count")
        )
        paired_counts = paired_counts.with_columns(pl.lit(hours_count).cast(pl.Int64).alias("hours_count"))

    paired_counts = paired_counts.collect() if isinstance(paired_counts, pl.LazyFrame) else paired_counts

    if paired_counts.is_empty():
        return []

    grouped_by_pair: dict[tuple[str, str], dict] = {}

    for row in paired_counts.iter_rows(named=True):
        if row["station_a_id"] is None or row["station_b_id"] is None:
            continue

        pair_key = (row["station_a_id"], row["station_b_id"])

        if pair_key not in grouped_by_pair:
            grouped_by_pair[pair_key] = {
                "station_a_id": row["station_a_id"],
                "station_a_name": row["station_a_name"],
                "station_a_lat": row["station_a_lat"],
                "station_a_lon": row["station_a_lon"],
                "station_b_id": row["station_b_id"],
                "station_b_name": row["station_b_name"],
                "station_b_lat": row["station_b_lat"],
                "station_b_lon": row["station_b_lon"],
                "pair_total_rides": 0,
                "groups": [],
            }

        grouped_by_pair[pair_key]["pair_total_rides"] += row["total_rides"]
        grouped_by_pair[pair_key]["groups"].append(
            GroupedTripsCountBetweenStations(
                day_of_week=row.get("day_of_week"),
                hour=row.get("hour"),
                a_to_b_count=row["a_to_b_count"],
                b_to_a_count=row["b_to_a_count"],
                total_rides=row["total_rides"],
                hours_count=row["hours_count"],
            )
        )

    sorted_pairs = sorted(
        grouped_by_pair.values(),
        key=lambda pair: pair["pair_total_rides"],
        reverse=True,
    )[:limit]

    for pair in sorted_pairs:
        pair["groups"].sort(
            key=lambda group: (
                group.day_of_week if group.day_of_week is not None else -1,
                group.hour if group.hour is not None else -1,
            )
        )

    return [
        TripsCountBetweenStations(
            station_a_id=pair["station_a_id"],
            station_a_name=pair["station_a_name"],
            station_a_lat=pair["station_a_lat"],
            station_a_lon=pair["station_a_lon"],
            station_b_id=pair["station_b_id"],
            station_b_name=pair["station_b_name"],
            station_b_lat=pair["station_b_lat"],
            station_b_lon=pair["station_b_lon"],
            groups=pair["groups"],
        )
        for pair in sorted_pairs
    ]