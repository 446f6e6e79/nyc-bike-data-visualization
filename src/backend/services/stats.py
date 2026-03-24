import polars as pl
from datetime import date

from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    GroupedStationRideCount,
    GroupedStats,
    GroupedTripsCountBetweenStations,
    Stats,
    StatsGroupBy,
    StationRideCounts,
    TripsCountBetweenStations
)
from src.backend.services.rides import add_trip_duration, get_filtered_rides
from src.backend.loaders.rides_loader import RideFrame

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

def _stats_aggregations() -> list[pl.Expr]:
    """Helper to return the list of aggregations needed to calculate stats for grouped queries."""
    return [
        pl.len().alias("total_rides"),
        pl.col("started_at").dt.date().n_unique().alias("days_count"),
        pl.col("trip_duration_seconds").mean().alias("average_duration_seconds"),
        pl.col("distance_km").mean().alias("average_distance_km"),
        pl.col("trip_duration_seconds").sum().alias("total_duration_seconds"),
        pl.col("distance_km").sum().alias("total_distance_km"),
    ]

def get_stats_data(
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> Stats | list[GroupedStats]:
    """Get historical rides stats, optionally grouped by day_of_week, hour, or both."""
    if group_by != StatsGroupBy.NONE:
        return _get_grouped_stats(
            group_by=group_by,
            user_type=user_type,
            bike_type=bike_type,
            start_date=start_date,
            end_date=end_date,
            day_of_week=day_of_week,
            start_hour=start_hour,
            start_station_id=start_station_id,
            end_station_id=end_station_id,
        )

    return _get_overall_stats(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=day_of_week,
        start_hour=start_hour,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
    )
    
def _get_overall_stats(
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> Stats:
    rides = get_filtered_rides(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=day_of_week,
        start_hour=start_hour,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
        join_distances=True,
    )
    # Add trip duration in seconds to the rides before calculating stats
    rides = add_trip_duration(rides)
    df = _collect_if_lazy(rides)

    if df.is_empty():
        return Stats(
            total_rides=0,
            days_count=0,
            average_duration_seconds=0.0,
            average_distance_km=0.0,
            total_duration_seconds=0.0,
            total_distance_km=0.0,
        )
    return Stats(
        total_rides=df.shape[0],
        days_count=df["started_at"].dt.date().n_unique(),
        average_duration_seconds=df["trip_duration_seconds"].mean(),
        average_distance_km=df["distance_km"].mean(),
        total_duration_seconds=df["trip_duration_seconds"].sum(),
        total_distance_km=df["distance_km"].sum(),
    )

def _get_grouped_stats(
    group_by: StatsGroupBy,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> list[GroupedStats]:
    rides = get_filtered_rides(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=day_of_week,
        start_hour=start_hour,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
        join_distances=True,
    )
    rides = add_trip_duration(rides)
    df = _collect_if_lazy(rides)

    # Define expressions for extracting day_of_week and hour from started_at for grouping
    day_expr = (pl.col("started_at").dt.weekday() - 1).alias("day_of_week") # NOTE: Polars weekday() returns [1,7] for Monday-Sunday, we adjust to [0,6] with -1
    hour_expr = pl.col("started_at").dt.hour().alias("hour")

    # If we are grouping by day_of_week
    if group_by == StatsGroupBy.DAY_OF_WEEK:
        # Create a base DataFrame to ensure a response row for each day of the week
        base = pl.DataFrame({"day_of_week": list(range(7))})
        grouped = (
            df.group_by(day_expr).agg(_stats_aggregations())
            if not df.is_empty()
            else pl.DataFrame(schema={"day_of_week": pl.Int64})
        )
        # Join the grouped stats with the base DataFrame to ensure all days of the week are represented, filling nulls with 0 or appropriate defaults
        grouped = (
            base.join(grouped, on="day_of_week", how="left")
            .with_columns([
                pl.col("total_rides").fill_null(0).cast(pl.Int64),
                pl.col("days_count").fill_null(0).cast(pl.Int64),
                pl.col("average_duration_seconds").fill_null(0.0),
                pl.col("average_distance_km").fill_null(0.0),
                pl.col("total_duration_seconds").fill_null(0.0),
                pl.col("total_distance_km").fill_null(0.0),
            ])
            .sort("day_of_week")
        )
        return [
            GroupedStats(
                day_of_week=row["day_of_week"],
                hour=None,
                total_rides=row["total_rides"],
                days_count=row["days_count"],
                average_duration_seconds=row["average_duration_seconds"],
                average_distance_km=row["average_distance_km"],
                total_duration_seconds=row["total_duration_seconds"],
                total_distance_km=row["total_distance_km"],
            )
            for row in grouped.iter_rows(named=True)
        ]
    # If we are grouping by hour
    if group_by == StatsGroupBy.HOUR:
        base = pl.DataFrame({"hour": list(range(24))})
        grouped = (
            df.group_by(hour_expr).agg(_stats_aggregations())
            if not df.is_empty()
            else pl.DataFrame(schema={"hour": pl.Int64})
        )
        grouped = (
            base.join(grouped, on="hour", how="left")
            .with_columns([
                pl.col("total_rides").fill_null(0).cast(pl.Int64),
                pl.col("days_count").fill_null(0).cast(pl.Int64),
                pl.col("average_duration_seconds").fill_null(0.0),
                pl.col("average_distance_km").fill_null(0.0),
                pl.col("total_duration_seconds").fill_null(0.0),
                pl.col("total_distance_km").fill_null(0.0),
            ])
            .sort("hour")
        )
        return [
            GroupedStats(
                day_of_week=None,
                hour=row["hour"],
                total_rides=row["total_rides"],
                days_count=row["days_count"],
                average_duration_seconds=row["average_duration_seconds"],
                average_distance_km=row["average_distance_km"],
                total_duration_seconds=row["total_duration_seconds"],
                total_distance_km=row["total_distance_km"],
            )
            for row in grouped.iter_rows(named=True)
        ]
    # If we are grouping by both day_of_week and hour, we create a base DataFrame with all combinations of day_of_week and hour to ensure we return a row for each combination, even if there are no rides for that combination
    base = (
        pl.DataFrame({"day_of_week": list(range(7))})
        .join(pl.DataFrame({"hour": list(range(24))}), how="cross")
    )
    grouped = (
        df.group_by([day_expr, hour_expr]).agg(_stats_aggregations())
        if not df.is_empty()
        else pl.DataFrame(schema={"day_of_week": pl.Int64, "hour": pl.Int64})
    )
    grouped = (
        base.join(grouped, on=["day_of_week", "hour"], how="left")
        .with_columns([
            pl.col("total_rides").fill_null(0).cast(pl.Int64),
            pl.col("days_count").fill_null(0).cast(pl.Int64),
            pl.col("average_duration_seconds").fill_null(0.0),
            pl.col("average_distance_km").fill_null(0.0),
            pl.col("total_duration_seconds").fill_null(0.0),
            pl.col("total_distance_km").fill_null(0.0),
        ])
        .sort(["day_of_week", "hour"])
    )
    return [
        GroupedStats(
            day_of_week=row["day_of_week"],
            hour=row["hour"],
            total_rides=row["total_rides"],
            days_count=row["days_count"],
            average_duration_seconds=row["average_duration_seconds"],
            average_distance_km=row["average_distance_km"],
            total_duration_seconds=row["total_duration_seconds"],
            total_distance_km=row["total_distance_km"],
        )
        for row in grouped.iter_rows(named=True)
    ]

def get_station_ride_counts_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    station_id: str | None = None,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    limit: int = 100,
) -> list[StationRideCounts]:
    # Get rides filtered by date range and optionally by station_id
    rides = get_filtered_rides(start_date=start_date, end_date=end_date)

    # If a station_id is provided, filter the rides starting or ending at that station
    # NOTE: i can't pass it directly to get_filtered_rides because we want an OR of the conditions
    if station_id:
        rides = rides.filter(
            (pl.col("start_station_id") == station_id)
            | (pl.col("end_station_id") == station_id)
        )

    day_expr = (pl.col("started_at").dt.weekday() - 1).alias("day_of_week")
    hour_expr = pl.col("started_at").dt.hour().alias("hour")
    # Create grouping expressions and corresponding column names based on the group_by parameter
    group_exprs: list[pl.Expr] = []
    group_cols: list[str] = []

    if group_by == StatsGroupBy.DAY_OF_WEEK:
        group_exprs = [day_expr]
        group_cols = ["day_of_week"]
    elif group_by == StatsGroupBy.HOUR:
        group_exprs = [hour_expr]
        group_cols = ["hour"]
    elif group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        group_exprs = [day_expr, hour_expr]
        group_cols = ["day_of_week", "hour"]
    # Append station_id to the grouping keys for outgoing and incoming counts
    outgoing_group_keys: list[str | pl.Expr] = [*group_exprs, "start_station_id"]
    incoming_group_keys: list[str | pl.Expr] = [*group_exprs, "end_station_id"]

    # Compute the outgoing rides for each station, grouped by the specified time period
    outgoing = (
        rides.group_by(outgoing_group_keys)
        .agg([
            pl.count().alias("outgoing"),                                   # Count of rides starting at the station
            pl.first("start_lat").alias("lat"),                             # Latitude of the station (taken from the starting point of the ride)
            pl.first("start_lng").alias("lon"),                             # Longitude of the station   
            pl.col("started_at").dt.date().n_unique().alias("days_count"),  # Number of unique days with rides starting at the station (used to understand how many days contributed to the ride count)
        ])
        .rename({"start_station_id": "station_id"})                         # Rename the station_id column for the outgoing counts to "station_id" for easier joining later
    )
    # Compute the incoming rides for each station, grouped by the specified time period
    incoming = (
        rides.group_by(incoming_group_keys)
        .agg([
            pl.count().alias("incoming"),                                   # Count of rides ending at the station        
            pl.first("end_lat").alias("lat"),                               # Latitude of the station (taken from the ending point of the ride)
            pl.first("end_lng").alias("lon"),                               # Longitude of the station
            pl.col("started_at").dt.date().n_unique().alias("days_count"),  # Number of unique days with rides ending at the station (used to understand how many days contributed to the ride count)
        ])
        .rename({"end_station_id": "station_id"})                           # Rename the station_id column for the incoming counts to "station_id" for easier joining later
    )

    # Define the keys to join outgoing and incoming counts on. If grouping by time periods, we need to include those in the join keys
    join_keys = [*group_cols, "station_id"] if group_cols else ["station_id"]

    # Join the outgoing and incoming counts on the station_id (and time period columns if grouping) to get a combined view of rides starting and ending at each station, along with their lat/lon and days_count. We use an outer join to ensure we include stations that only have outgoing or only have incoming rides, filling nulls with 0 for counts and coalescing lat/lon from either side of the join.
    station_counts = outgoing.join(
        incoming,
        on=join_keys,
        how="outer",
        suffix="_right",    # The incoming columns will get a "_right" suffix in the case of overlapping column names
    ).select([
        *[
            # For each column, we keep the ones from outgoing if they exist, otherwise we take them from incoming
            pl.coalesce(col, f"{col}_right").alias(col)
            for col in group_cols
        ],
        # Do the same coalescing for constant columns
        pl.coalesce("station_id", "station_id_right").alias("station_id"),
        pl.coalesce("lat", "lat_right").alias("lat"),
        pl.coalesce("lon", "lon_right").alias("lon"),
        pl.col("outgoing").fill_null(0),
        pl.col("incoming").fill_null(0),
        # For the days_count, we take the max of the outgoing and incoming days_count to avoid double-counting days where there are both outgoing and incoming rides at the station.
        pl.max_horizontal(
            pl.col("days_count").fill_null(0),
            pl.col("days_count_right").fill_null(0),
        ).alias("days_count"),
    ])

    # Calculate the total rides for each station by summing the outgoing and incoming counts.
    station_counts = station_counts.with_columns(
        (pl.col("outgoing") + pl.col("incoming")).alias("total_rides")
    )
    # Collect the results into memory 
    station_counts = _collect_if_lazy(station_counts)
    if station_counts.is_empty():
        return []

    # Group the final results by station_id to create the response structure
    grouped_by_station: dict[str, dict] = {}
    
    # For each row in the results
    for row in station_counts.iter_rows(named=True):
        station_key = row["station_id"]
        # If it's the first time we see this station_id, initialize the entry
        if station_key not in grouped_by_station:
            grouped_by_station[station_key] = {
                "station_id": row["station_id"],
                "lat": row["lat"],
                "lon": row["lon"],
                "station_total_rides": 0,
                "groups": [],
            }
        # Update the total rides for the station
        grouped_by_station[station_key]["station_total_rides"] += row["total_rides"]
        grouped_by_station[station_key]["groups"].append(
            GroupedStationRideCount(
                day_of_week=row.get("day_of_week"),
                hour=row.get("hour"),
                outgoing_rides=row["outgoing"],
                incoming_rides=row["incoming"],
                total_rides=row["total_rides"],
                days_count=row["days_count"],
            )
        )

    # Once grouped, sort them by the total rides 
    sorted_stations = sorted(
        grouped_by_station.values(),
        key=lambda station: station["station_total_rides"],
        reverse=True,
    )[:limit]

    # For each station, sort the groups by day_of_week and then by hour to ensure a consistent order in the response
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
            lat=station["lat"],
            lon=station["lon"],
            groups=station["groups"],
        )
        for station in sorted_stations
    ]

def get_trips_between_stations_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    station_id: str | None = None,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    limit: int = 100,
) -> list[TripsCountBetweenStations]:
    # Get rides filtered by date range and optionally by station_id
    rides = get_filtered_rides(start_date=start_date, end_date=end_date)

    # If station_id is provided, filter rides to only those that start or end at the station
    if station_id:  
        rides = rides.filter(
            (pl.col("start_station_id") == station_id)
            | (pl.col("end_station_id") == station_id)
        )

    day_expr = (pl.col("started_at").dt.weekday() - 1).alias("day_of_week")
    hour_expr = pl.col("started_at").dt.hour().alias("hour")
    group_exprs: list[pl.Expr] = []
    group_cols: list[str] = []

    if group_by == StatsGroupBy.DAY_OF_WEEK:
        group_exprs = [day_expr]
        group_cols = ["day_of_week"]
    elif group_by == StatsGroupBy.HOUR:
        group_exprs = [hour_expr]
        group_cols = ["hour"]
    elif group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        group_exprs = [day_expr, hour_expr]
        group_cols = ["day_of_week", "hour"]

    # Calculate directional counts between station pairs
    directional_counts = (
        rides.group_by([*group_exprs, "start_station_id", "end_station_id"])
        .agg([
            pl.count().alias("ride_count"),
            # We take the first lat/lng for each station pair, assuming they are consistent for a given station
            pl.first("start_lat").alias("start_lat"),
            pl.first("start_lng").alias("start_lon"),
            pl.first("end_lat").alias("end_lat"),
            pl.first("end_lng").alias("end_lon"),
        ])
    )

    # Create a pair_id that is the same for (A->B) and (B->A) to group them together
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

    pair_days = (
        rides.with_columns([
            *group_exprs,
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
        ])
        .group_by([*group_cols, "pair_id"] if group_cols else ["pair_id"])
        .agg(pl.col("started_at").dt.date().n_unique().alias("days_count"))
    )

    # Separate forward and reverse counts, naming them station_a and station_b consistently
    forward_counts = directional_counts.filter(pl.col("is_forward")).select([
        *group_cols,
        "pair_id",
        pl.col("start_station_id").alias("station_a_id"),
        pl.col("start_lat").alias("station_a_lat"),
        pl.col("start_lon").alias("station_a_lon"),
        pl.col("end_station_id").alias("station_b_id"),
        pl.col("end_lat").alias("station_b_lat"),
        pl.col("end_lon").alias("station_b_lon"),
        pl.col("ride_count").alias("a_to_b_count"),
    ])
    # For reverse counts, we swap the station_a and station_b to align with the forward counts
    reverse_counts = directional_counts.filter(~pl.col("is_forward")).select([
        *group_cols,
        "pair_id",
        pl.col("end_station_id").alias("station_a_id"),
        pl.col("end_lat").alias("station_a_lat"),
        pl.col("end_lon").alias("station_a_lon"),
        pl.col("start_station_id").alias("station_b_id"),
        pl.col("start_lat").alias("station_b_lat"),
        pl.col("start_lon").alias("station_b_lon"),
        pl.col("ride_count").alias("b_to_a_count"),
    ])
    # Join forward and reverse counts on the unique pair_id to get both directions in the same row   
    paired_counts = forward_counts.join(
        reverse_counts,
        on=[*group_cols, "pair_id"] if group_cols else ["pair_id"],
        how="outer",
        suffix="_right",
    ).join(
        pair_days,
        on=[*group_cols, "pair_id"] if group_cols else ["pair_id"],
        how="left",
    ).select([
        *[
            pl.coalesce(col, f"{col}_right").alias(col)
            for col in group_cols
        ],
        pl.coalesce("station_a_id", "station_a_id_right").alias("station_a_id"),
        pl.coalesce("station_a_lat", "station_a_lat_right").alias("station_a_lat"),
        pl.coalesce("station_a_lon", "station_a_lon_right").alias("station_a_lon"),
        pl.coalesce("station_b_id", "station_b_id_right").alias("station_b_id"),
        pl.coalesce("station_b_lat", "station_b_lat_right").alias("station_b_lat"),
        pl.coalesce("station_b_lon", "station_b_lon_right").alias("station_b_lon"),
        # Fill nulls with 0 for counts where there is no data in one direction
        pl.col("a_to_b_count").fill_null(0),
        pl.col("b_to_a_count").fill_null(0),
        pl.col("days_count").fill_null(0),
    ])

    paired_counts = paired_counts.with_columns(
        (pl.col("a_to_b_count") + pl.col("b_to_a_count")).alias("total_rides")
    )

    paired_counts = _collect_if_lazy(paired_counts)
    if paired_counts.is_empty():
        return []

    grouped_by_pair: dict[tuple[str, str], dict] = {}
    for row in paired_counts.iter_rows(named=True):
        pair_key = (row["station_a_id"], row["station_b_id"])
        if pair_key not in grouped_by_pair:
            grouped_by_pair[pair_key] = {
                "station_a_id": row["station_a_id"],
                "station_a_lat": row["station_a_lat"],
                "station_a_lon": row["station_a_lon"],
                "station_b_id": row["station_b_id"],
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
                days_count=row["days_count"],
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
            station_a_lat=pair["station_a_lat"],
            station_a_lon=pair["station_a_lon"],
            station_b_id=pair["station_b_id"],
            station_b_lat=pair["station_b_lat"],
            station_b_lon=pair["station_b_lon"],
            groups=pair["groups"],
        )
        for pair in sorted_pairs
    ]