import polars as pl
from datetime import date, datetime, time
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    GroupedStationRideCount,
    GroupedStats,
    GroupedTripsCountBetweenStations,
    Stats,
    StatsGroupBy,
    StationRideCounts,
    TripsCountBetweenStations,
)
from src.backend.services.rides import add_trip_duration, get_filtered_rides
from src.backend.loaders.rides_loader import RideFrame

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

def _build_time_dimension(
    start_date: date,
    end_date: date,
    weather_df: pl.DataFrame | None = None,
) -> pl.LazyFrame:
    """
    Create a time dimension DataFrame with hourly timestamps between start_date and end_date.
    This allows us to group rides by time periods (day of week, hour) even if there are no rides
    in certain periods, ensuring we get a complete set of time buckets in our stats results.
    """
    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.max)

    df = pl.LazyFrame({
        "started_at": pl.datetime_range(
            start=start_dt,
            end=end_dt,
            interval="1h",
            eager=True,
        )
    })

    df = df.with_columns([
        (pl.col("started_at").dt.weekday() - 1).alias("day_of_week"),
        pl.col("started_at").dt.hour().alias("hour"),
    ])

    if weather_df is None:
        return df

    weather = weather_df
    rename_map: dict[str, str] = {}
    if "datetime" in weather.columns:
        rename_map["datetime"] = "time"
    if "temperature_2m" in weather.columns:
        rename_map["temperature_2m"] = "temperature"
    if "wind_speed_10m" in weather.columns:
        rename_map["wind_speed_10m"] = "wind_speed"
    if rename_map:
        weather = weather.rename(rename_map)

    return (
        df
        .sort("started_at")
        .join_asof(
            weather.sort("time"),
            left_on="started_at",
            right_on="time",
            strategy="nearest",
            tolerance="30m",
        )
    )

#TODO: check if we are really using day of the week filtering or hour filtering
def _apply_time_dimension_filters(
    time_dim: pl.LazyFrame,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
) -> pl.LazyFrame:
    if day_of_week is not None:
        day_values = day_of_week if isinstance(day_of_week, list) else [day_of_week]
        time_dim = time_dim.filter(pl.col("day_of_week").is_in(day_values))

    if start_hour is not None:
        time_dim = time_dim.filter(pl.col("hour") == start_hour)

    return time_dim


def _resolve_time_bounds(
    start_date: date | None,
    end_date: date | None,
    rides_df: pl.DataFrame,
    infer_if_missing: bool,
) -> tuple[date | None, date | None]:
    
    if start_date is not None and end_date is not None:
        return start_date, end_date
    if not infer_if_missing or rides_df.is_empty():
        return start_date, end_date

    bounds = rides_df.select([
        pl.col("started_at").dt.date().min().alias("min_date"),
        pl.col("started_at").dt.date().max().alias("max_date"),
    ]).row(0, named=True)

    resolved_start = start_date if start_date is not None else bounds["min_date"]
    resolved_end = end_date if end_date is not None else bounds["max_date"]
    return resolved_start, resolved_end

def _time_dimension_base(
    start_date: date | None,
    end_date: date | None,
    group_by: StatsGroupBy,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
) -> pl.DataFrame | None:
    """
    Return a base DataFrame of all possible time buckets for the given group_by mode,
    derived from the time dimension when start_date and end_date are both provided.
    Returns None when the date range is unknown or the group_by does not use time buckets.
    """
    if start_date is None or end_date is None:
        return None
    if group_by not in (StatsGroupBy.DAY_OF_WEEK, StatsGroupBy.HOUR, StatsGroupBy.DAY_OF_WEEK_AND_HOUR):
        return None

    time_dim = _build_time_dimension(start_date, end_date)
    time_dim = _apply_time_dimension_filters(time_dim, day_of_week=day_of_week, start_hour=start_hour)

    if group_by == StatsGroupBy.DAY_OF_WEEK:
        return time_dim.select("day_of_week").unique().sort("day_of_week")

    if group_by == StatsGroupBy.HOUR:
        return time_dim.select("hour").unique().sort("hour")

    if group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        return (
            time_dim.select(["day_of_week", "hour"])
            .unique()
            .sort(["day_of_week", "hour"])
        )

    return None  # unreachable, but satisfies type checker

def _hours_count_from_time_dimension(
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
    weather_df: pl.DataFrame | None = None,
) -> pl.DataFrame:
    """
    Compute the number of hours in the date range for each group bucket, derived from the time
    dimension. This ensures that empty hours are still counted in the hours_count for each group,
    which is used as the denominator for computing hourly averages (e.g. total_rides / hours_count).
    """
    time_dim = _build_time_dimension(start_date, end_date, weather_df=weather_df)
    time_dim = _apply_time_dimension_filters(time_dim, day_of_week=day_of_week, start_hour=start_hour)

    if group_by == StatsGroupBy.NONE:
        return pl.DataFrame({"hours_count": [time_dim.height]})

    if group_by == StatsGroupBy.DAY_OF_WEEK:
        return time_dim.group_by("day_of_week").agg(pl.len().alias("hours_count"))

    if group_by == StatsGroupBy.HOUR:
        return time_dim.group_by("hour").agg(pl.len().alias("hours_count"))

    if group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        return time_dim.group_by(["day_of_week", "hour"]).agg(pl.len().alias("hours_count"))

    if group_by == StatsGroupBy.WEATHER_CODE:
        return (
            time_dim
            .drop_nulls("weather_code")
            .group_by("weather_code")
            .agg(pl.len().alias("hours_count"))
        )

    return pl.DataFrame(schema={"hours_count": pl.UInt32})

def _stats_aggregations() -> list[pl.Expr]:
    """
    Helper to return the list of aggregations needed to calculate stats for grouped queries.
    Note: hours_count is intentionally excluded here — it is always sourced from the time
    dimension via _hours_count_from_time_dimension to ensure empty hours are counted correctly.
    """
    return [
        pl.len().alias("total_rides"),
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

    rides = add_trip_duration(rides)
    df = _collect_if_lazy(rides)

    resolved_start_date, resolved_end_date = _resolve_time_bounds(
        start_date=start_date,
        end_date=end_date,
        rides_df=df,
        infer_if_missing=True,
    )

    hours_count = 0
    if resolved_start_date is not None and resolved_end_date is not None:
        hours_count_df = _hours_count_from_time_dimension(
            start_date=resolved_start_date,
            end_date=resolved_end_date,
            group_by=StatsGroupBy.NONE,
            day_of_week=day_of_week,
            start_hour=start_hour,
        )
        hours_count = int(hours_count_df.item(0, "hours_count"))

    if df.is_empty():
        return Stats(
            total_rides=0,
            hours_count=hours_count,
            average_duration_seconds=0.0,
            average_distance_km=0.0,
            total_duration_seconds=0.0,
            total_distance_km=0.0,
        )

    return Stats(
        total_rides=df.shape[0],
        hours_count=hours_count,
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
        # Do NOT join weather onto rides for WEATHER_CODE grouping — we join rides onto the
        # weather-enriched time dimension instead, so empty hours are still assigned a weather_code.
        join_weather=False,
    )

    rides = add_trip_duration(rides)
    df = _collect_if_lazy(rides)
    resolved_start_date, resolved_end_date = _resolve_time_bounds(
        start_date=start_date,
        end_date=end_date,
        rides_df=df,
        infer_if_missing=False,
    )

    day_expr = (pl.col("started_at").dt.weekday() - 1).alias("day_of_week")
    hour_expr = pl.col("started_at").dt.hour().alias("hour")

    def _make_grouped_stats(row: dict) -> GroupedStats:
        """Build a GroupedStats instance from a row dict, safely extracting optional fields."""
        return GroupedStats(
            day_of_week=row.get("day_of_week"),
            hour=row.get("hour"),
            weather_code=row.get("weather_code"),
            total_rides=row["total_rides"],
            hours_count=row["hours_count"],
            average_duration_seconds=row["average_duration_seconds"],
            average_distance_km=row["average_distance_km"],
            total_duration_seconds=row["total_duration_seconds"],
            total_distance_km=row["total_distance_km"],
        )

    def _fill_nulls(df: pl.DataFrame) -> pl.DataFrame:
        """Fill nulls in aggregated stats columns with appropriate defaults."""
        return df.with_columns([
            pl.col("total_rides").fill_null(0).cast(pl.Int64),
            pl.col("average_duration_seconds").fill_null(0.0),
            pl.col("average_distance_km").fill_null(0.0),
            pl.col("total_duration_seconds").fill_null(0.0),
            pl.col("total_distance_km").fill_null(0.0),
        ])

    def _attach_hours_count(df: pl.DataFrame, group_cols: list[str]) -> pl.DataFrame:
        """
        Join the correct hours_count from the time dimension onto the grouped stats DataFrame.
        Falls back to 0 when no date range is available (e.g. no start_date/end_date provided).
        """
        if resolved_start_date and resolved_end_date:
            hours_count = _hours_count_from_time_dimension(
                start_date=resolved_start_date,
                end_date=resolved_end_date,
                group_by=group_by,
                day_of_week=day_of_week,
                start_hour=start_hour,
            )
            return (
                df.join(hours_count, on=group_cols, how="left")
                .with_columns(pl.col("hours_count").fill_null(0).cast(pl.Int64))
            )
        return df.with_columns(pl.lit(0).cast(pl.Int64).alias("hours_count"))

    # GROUP BY: day_of_week
    if group_by == StatsGroupBy.DAY_OF_WEEK:
        base = _time_dimension_base(
            resolved_start_date,
            resolved_end_date,
            group_by,
            day_of_week=day_of_week,
            start_hour=start_hour,
        )
        if base is None:
            base = pl.DataFrame({"day_of_week": list(range(7))})
        grouped = (
            df.group_by(day_expr).agg(_stats_aggregations())
            if not df.is_empty()
            else pl.DataFrame(schema={"day_of_week": pl.Int64})
        )
        grouped = _attach_hours_count(
            _fill_nulls(base.join(grouped, on="day_of_week", how="left")).sort("day_of_week"),
            ["day_of_week"],
        )
        return [_make_grouped_stats(row) for row in grouped.iter_rows(named=True)]

    # GROUP BY: hour
    if group_by == StatsGroupBy.HOUR:
        base = _time_dimension_base(
            resolved_start_date,
            resolved_end_date,
            group_by,
            day_of_week=day_of_week,
            start_hour=start_hour,
        )
        if base is None:
            base = pl.DataFrame({"hour": list(range(24))})
        grouped = (
            df.group_by(hour_expr).agg(_stats_aggregations())
            if not df.is_empty()
            else pl.DataFrame(schema={"hour": pl.Int64})
        )
        grouped = _attach_hours_count(
            _fill_nulls(base.join(grouped, on="hour", how="left")).sort("hour"),
            ["hour"],
        )
        return [_make_grouped_stats(row) for row in grouped.iter_rows(named=True)]

    # GROUP BY: weather_code
    # Instead of joining weather onto rides (which misses hours with no rides), we join rides
    # onto the weather-enriched time dimension so every hour has a weather_code as its base.
    if group_by == StatsGroupBy.WEATHER_CODE:
        if resolved_start_date is None or resolved_end_date is None:
            # Without a date range we can't build the time dimension — fall back to ride-side join
            if df.is_empty():
                return []
            rides_with_weather = get_filtered_rides(
                user_type=user_type, bike_type=bike_type,
                start_date=start_date, end_date=end_date,
                day_of_week=day_of_week, start_hour=start_hour,
                start_station_id=start_station_id, end_station_id=end_station_id,
                join_distances=True, join_weather=True,
            )
            rides_with_weather = add_trip_duration(rides_with_weather)
            df = _collect_if_lazy(rides_with_weather)
            df = df.with_columns(
                pl.col("weather").struct.field("weather_code").alias("weather_code")
            )
            grouped = (
                df.drop_nulls("weather_code")
                .group_by("weather_code")
                .agg(_stats_aggregations())
                .with_columns(pl.lit(0).cast(pl.Int64).alias("hours_count"))
                .sort("weather_code")
            )
            return [_make_grouped_stats(row) for row in grouped.iter_rows(named=True)]

        # Build the weather-enriched time dimension: one row per hour, each carrying a weather_code.
        # Then truncate rides to the hour and join them onto this base so every hour is represented.
        from src.backend.loaders.weather_loader import load_weather_data

        weather_df = load_weather_data().collect()
        time_dim_w = _build_time_dimension(
            resolved_start_date,
            resolved_end_date,
            weather_df=weather_df,
        )
        time_dim_w = _apply_time_dimension_filters(
            time_dim_w,
            day_of_week=day_of_week,
            start_hour=start_hour,
        )

        # Truncate each ride's started_at to the hour so we can join onto the time dimension
        rides_hourly = (
            df.with_columns(pl.col("started_at").dt.truncate("1h").alias("started_at_hour"))
            if not df.is_empty()
            else df.with_columns(pl.lit(None).cast(pl.Datetime).alias("started_at_hour"))
        )

        # Group rides by hour bucket first, aggregating stats per hour
        rides_by_hour = (
            rides_hourly
            .group_by("started_at_hour")
            .agg(_stats_aggregations())
            if not df.is_empty()
            else pl.DataFrame(schema={"started_at_hour": pl.Datetime})
        )

        # Join ride-hour aggregates onto the time dimension to attach weather_code to each hour,
        # including hours with no rides (they will have null ride stats, filled with 0 below).
        hourly_with_weather = (
            time_dim_w
            .select(["started_at", "weather_code"])
            .rename({"started_at": "started_at_hour"})
            .join(rides_by_hour, on="started_at_hour", how="left")
        )

        # Group by weather_code, summing totals and computing weighted averages across all hours
        # that share the same code (including empty hours which contribute 0 rides).
        grouped = (
            hourly_with_weather
            .drop_nulls("weather_code")
            .group_by("weather_code")
            .agg([
                pl.col("total_rides").fill_null(0).sum().alias("total_rides"),
                pl.col("total_duration_seconds").fill_null(0.0).sum().alias("total_duration_seconds"),
                pl.col("total_distance_km").fill_null(0.0).sum().alias("total_distance_km"),
                # Weighted average: sum(mean * count) / total_count, clipped to avoid division by zero
                (
                    (pl.col("average_duration_seconds").fill_null(0.0) * pl.col("total_rides").fill_null(0)).sum()
                    / pl.col("total_rides").fill_null(0).sum().clip(lower_bound=1)
                ).alias("average_duration_seconds"),
                (
                    (pl.col("average_distance_km").fill_null(0.0) * pl.col("total_rides").fill_null(0)).sum()
                    / pl.col("total_rides").fill_null(0).sum().clip(lower_bound=1)
                ).alias("average_distance_km"),
            ])
            .sort("weather_code")
        )

        grouped = _attach_hours_count(grouped, ["weather_code"])
        return [_make_grouped_stats(row) for row in grouped.iter_rows(named=True)]

    # GROUP BY: day_of_week + hour
    if group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        base = _time_dimension_base(
            resolved_start_date,
            resolved_end_date,
            group_by,
            day_of_week=day_of_week,
            start_hour=start_hour,
        )
        if base is None:
            base = pl.DataFrame({"day_of_week": list(range(7))}).join(
                pl.DataFrame({"hour": list(range(24))}), how="cross"
            )
        grouped = (
            df.group_by([day_expr, hour_expr]).agg(_stats_aggregations())
            if not df.is_empty()
            else pl.DataFrame(schema={"day_of_week": pl.Int64, "hour": pl.Int64})
        )
        grouped = _attach_hours_count(
            _fill_nulls(base.join(grouped, on=["day_of_week", "hour"], how="left")).sort(["day_of_week", "hour"]),
            ["day_of_week", "hour"],
        )
        return [_make_grouped_stats(row) for row in grouped.iter_rows(named=True)]

    raise ValueError(f"Unsupported group_by value: {group_by}")


def get_station_ride_counts_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    limit: int = 100,
) -> list[StationRideCounts]:
    rides = get_filtered_rides(start_date=start_date, end_date=end_date, user_type=user_type, bike_type=bike_type)

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

    outgoing_group_keys: list[str | pl.Expr] = [*group_exprs, "start_station_id"]
    incoming_group_keys: list[str | pl.Expr] = [*group_exprs, "end_station_id"]

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

    join_keys = [*group_cols, "station_id"] if group_cols else ["station_id"]

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

    station_counts = station_counts.with_columns(
        (pl.col("outgoing") + pl.col("incoming")).alias("total_rides")
    )

    time_base = _time_dimension_base(start_date, end_date, group_by)
    if time_base is not None and group_cols:
        station_counts = (
            time_base
            .join(station_counts, on=group_cols, how="left")
            .with_columns([
                pl.col("outgoing").fill_null(0),
                pl.col("incoming").fill_null(0),
                pl.col("total_rides").fill_null(0),
            ])
        )

    # Attach hours_count from the time dimension so that empty hours are counted correctly.
    if group_cols and start_date and end_date:
        hours_count_df = _hours_count_from_time_dimension(start_date, end_date, group_by)
        station_counts = (
            station_counts
            .join(hours_count_df, on=group_cols, how="left")
            .with_columns(pl.col("hours_count").fill_null(0).cast(pl.Int64))
        )
    else:
        station_counts = station_counts.with_columns(pl.lit(0).cast(pl.Int64).alias("hours_count"))

    station_counts = _collect_if_lazy(station_counts)

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


def get_trips_between_stations_stats(
    start_date: date | None = None,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    end_date: date | None = None,
    station_id: str | None = None,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    limit: int = 100,
) -> list[TripsCountBetweenStations]:
    rides = get_filtered_rides(start_date=start_date, end_date=end_date, user_type=user_type, bike_type=bike_type)

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

    pair_hours = (
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
        .agg(pl.col("started_at").dt.truncate("1h").n_unique().alias("hours_count"))
    )

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
    ).join(
        pair_hours,
        on=[*group_cols, "pair_id"] if group_cols else ["pair_id"],
        how="left",
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
        pl.col("hours_count").fill_null(0),
    ])

    paired_counts = paired_counts.with_columns(
        (pl.col("a_to_b_count") + pl.col("b_to_a_count")).alias("total_rides")
    )

    time_base = _time_dimension_base(start_date, end_date, group_by)
    if time_base is not None and group_cols:
        paired_counts = (
            time_base
            .join(paired_counts, on=group_cols, how="left")
            .with_columns([
                pl.col("a_to_b_count").fill_null(0),
                pl.col("b_to_a_count").fill_null(0),
                pl.col("total_rides").fill_null(0),
                pl.col("hours_count").fill_null(0),
            ])
        )

    # Attach hours_count from the time dimension so that empty hours are counted correctly.
    if group_cols and start_date and end_date:
        hours_count_df = _hours_count_from_time_dimension(start_date, end_date, group_by)
        paired_counts = (
            paired_counts
            .drop("hours_count")  # drop the ride-derived hours_count before replacing it
            .join(hours_count_df, on=group_cols, how="left")
            .with_columns(pl.col("hours_count").fill_null(0).cast(pl.Int64))
        )
    else:
        paired_counts = paired_counts.with_columns(pl.lit(0).cast(pl.Int64).alias("hours_count"))

    paired_counts = _collect_if_lazy(paired_counts)

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