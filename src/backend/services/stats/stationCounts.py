import polars as pl
from datetime import date
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    GroupedStationRideCount,
    RideCountGroupBy,
    StationRideCounts,
)
from src.backend.services.stats.utils import (
    to_lazy,
    build_time_dimension,
    attach_hours_count,
    hours_count_from_time_dimension,
)
from src.backend.services.rides import get_filtered_rides

def get_station_ride_counts_stats(
    start_date: date,
    end_date: date,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    group_by: RideCountGroupBy = RideCountGroupBy.NONE,
    limit: int = 100,
) -> list[StationRideCounts]:
    # Get rides LazyFrame filtered by the provided parameters
    rides = to_lazy(get_filtered_rides(start_date=start_date, end_date=end_date, user_type=user_type, bike_type=bike_type))
    
    # If a station_id is provided, filter the rides to only those that start or end at the specified station
    if station_id:
        rides = rides.filter(
            (pl.col("start_station_id") == station_id)
            | (pl.col("end_station_id") == station_id)
        )
    # Define expressions for extracting day_of_week and hour for grouping porpouses
    day_expr = (pl.col("started_at").dt.weekday() - 1).alias("day_of_week")
    hour_expr = pl.col("started_at").dt.hour().alias("hour")
    
    # Build the group expressions and corresponding column names based on the group_by parameter
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

    outgoing_group_keys: list[str | pl.Expr] = [*group_exprs, "start_station_id"]
    incoming_group_keys: list[str | pl.Expr] = [*group_exprs, "end_station_id"]

    # Get the count of outgoing and incoming rides grouped by the specified keys
    outgoing = (
        rides.group_by(outgoing_group_keys)
        .agg([
            pl.len().alias("outgoing"),
            pl.first("start_station_name").alias("station_name"),
            pl.first("start_lat").alias("lat"),
            pl.first("start_lng").alias("lon"),
        ])
        .rename({"start_station_id": "station_id"})
    )
    # Get the count of incoming rides grouped by the specified keys
    incoming = (
        rides.group_by(incoming_group_keys)
        .agg([
            pl.len().alias("incoming"),
            pl.first("end_station_name").alias("station_name"),
            pl.first("end_lat").alias("lat"),
            pl.first("end_lng").alias("lon"),
        ])
        .rename({"end_station_id": "station_id"})
    )

    # Define the keys to join on (grouping columns + station_id)
    join_keys = [*group_cols, "station_id"] if group_cols else ["station_id"]

    # Perform a full outer join of outgoing and incoming counts on the defined keys
    station_counts = outgoing.join(
        incoming,
        on=join_keys,
        how="full",
        suffix="_right",
    ).select([
        *[
            pl.coalesce(col, f"{col}_right").alias(col)
            for col in group_cols
        ],
        pl.coalesce("station_id", "station_id_right").alias("station_id"),
        pl.coalesce("station_name", "station_name_right").alias("station_name"),
        pl.coalesce("lat", "lat_right").alias("lat"),
        pl.coalesce("lon", "lon_right").alias("lon"),
        pl.col("outgoing").fill_null(0),
        pl.col("incoming").fill_null(0),
    ])

    # Compute total rides as the sum of outgoing and incoming rides
    station_counts = station_counts.with_columns(
        (pl.col("outgoing") + pl.col("incoming")).alias("total_rides")
    )

    # Join with a time dimension table ensuring that all time groups are represented
    time_base = build_time_dimension(start_date, end_date, base_for_group_by=group_by)
    if group_cols:
        station_counts = (
            time_base.lazy()
            .join(station_counts.lazy(), on=group_cols, how="left")
            .with_columns([
                pl.col("outgoing").fill_null(0),
                pl.col("incoming").fill_null(0),
                pl.col("total_rides").fill_null(0),
            ])
        )
    # If we are grouping by time, we need to calculate the count of hours in each group
    if group_cols:
        station_counts = attach_hours_count(
            station_counts,
            group_cols,
            start_date,
            end_date,
            group_by,
        )
    # If not grouping by time, calculate the total hours in the date range and add as a column for each station to allow for average rides per hour calculations on the frontend
    else:
        hours_count = int(
            hours_count_from_time_dimension(start_date, end_date, RideCountGroupBy.NONE)
            .item(0, "hours_count")
        )
        station_counts = station_counts.with_columns(pl.lit(hours_count).cast(pl.Int64).alias("hours_count"))

    # Collect the results into memory
    station_counts = station_counts.collect() if isinstance(station_counts, pl.LazyFrame) else station_counts

    if station_counts.is_empty():
        return []

    grouped_by_station: dict[str, dict] = {}
    for row in station_counts.iter_rows(named=True):
        station_key = row["station_id"]

        if station_key is None:
            continue

        if station_key not in grouped_by_station:
            grouped_by_station[station_key] = {
                "station_id": row["station_id"],
                "station_name": row["station_name"],
                "lat": row["lat"],
                "lon": row["lon"],
                "station_total_rides": 0,
                "groups": [],
            }

        grouped_by_station[station_key]["station_total_rides"] += row["total_rides"]
        grouped_by_station[station_key]["groups"].append(
            GroupedStationRideCount(
                day_of_week=row.get("day_of_week"),
                hour=row.get("hour"),
                outgoing_rides=row["outgoing"],
                incoming_rides=row["incoming"],
                total_rides=row["total_rides"],
                hours_count=row["hours_count"],
            )
        )

    # Sort station counts by total rides
    sorted_stations = sorted(
        grouped_by_station.values(),
        key=lambda station: station["station_total_rides"],
        reverse=True,
    )[:limit]

    for station in sorted_stations:
        station["groups"].sort(
            key=lambda group: (
                group.day_of_week if group.day_of_week is not None else -1,
                group.hour if group.hour is not None else -1,
            )
        )

    return [
        StationRideCounts(
            station_id=station["station_id"],
            station_name=station["station_name"],
            lat=station["lat"],
            lon=station["lon"],
            groups=station["groups"],
        )
        for station in sorted_stations
    ]