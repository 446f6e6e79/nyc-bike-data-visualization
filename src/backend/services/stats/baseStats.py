import polars as pl
from datetime import date
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    GroupedStats,
    Stats,
    StatsGroupBy,
)
from src.backend.services.stats.utils import (
    build_time_dimension,
    hours_count_from_time_dimension,
    to_lazy,
    attach_hours_count,
)
from src.backend.services.rides import add_trip_duration, get_filtered_rides
from src.backend.loaders.weather_loader import load_weather_data

def _fill_null_exprs() -> list[pl.Expr]:
    """Helper to return a list of expressions to fill nulls in grouped stats results with appropriate default values."""
    return [
        pl.col("total_rides").fill_null(0).cast(pl.Int64),
        pl.col("average_duration_seconds").fill_null(0.0),
        pl.col("average_distance_km").fill_null(0.0),
        pl.col("total_duration_seconds").fill_null(0.0),
        pl.col("total_distance_km").fill_null(0.0),
        pl.col("avg_speed_kmh").fill_null(0.0),
    ]

def _compute_grouped_stats(
    rides_lf: pl.LazyFrame,             # The filtered rides LazyFrame
    base: pl.DataFrame,                 # The base time dimension DataFrame with all group buckets
    group_exprs: list[pl.Expr],         # Expressions to group by (e.g. day_of_week, hour)
    group_cols: list[str],              # Corresponding column names for the group expressions
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy,             # The grouping mode (e.g. by day_of_week, hour, etc.)
    weather_df: pl.DataFrame | None = None,
) -> pl.LazyFrame:
    """
    Compute grouped statistics for the given rides LazyFrame. 
    The stats are grouped by the specified group expressions (e.g. day_of_week, hour) and 
    joined with the base time dimension to ensure all group buckets are represented, 
    even those with no rides. 
    The hours_count is sourced from the time dimension to accurately reflect the number of hours in each group bucket.
    """
    # Group the rides by the specified expressions and compute the stats aggregations
    grouped = rides_lf.group_by(group_exprs).agg(_stats_aggregations())

    # LEFT Join the grouped stats back to the base time dimension to ensure all groups are represented, 
    # filling nulls for groups with no rides
    result = (
        base.lazy()
        .join(grouped, on=group_cols, how="left")
        .with_columns(_fill_null_exprs())   # Fill nulls for groups with no rides with appropriate default values
        .sort(group_cols)
    )
    # Attach the hours_count from the time dimension to ensure empty hours are counted correctly
    return attach_hours_count(
        result,
        group_cols,
        start_date,
        end_date,
        group_by,
        weather_df=weather_df,
    )

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
        (
            pl.when(pl.col("trip_duration_seconds").sum() > 0)
            .then(
                pl.col("distance_km").sum()
                / (pl.col("trip_duration_seconds").sum() / 3600)
            )
            .otherwise(0.0)
            .alias("avg_speed_kmh")
        ),
    ]

def get_stats_data(
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
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
            start_station_id=start_station_id,
            end_station_id=end_station_id,
        )

    return _get_overall_stats(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
    )

def _get_overall_stats(
    start_date: date,
    end_date: date,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> Stats:
    rides_lf = to_lazy(
        add_trip_duration(
            get_filtered_rides(
                user_type=user_type,
                bike_type=bike_type,
                start_date=start_date,
                end_date=end_date,
                start_station_id=start_station_id,
                end_station_id=end_station_id,
                join_distances=True,
            )
        )
    )
    # Aggregate the stats across all rides, filling nulls with default values for the case of no rides
    stats_row = rides_lf.select(_stats_aggregations()).collect().row(0, named=True)
    return Stats(
        total_rides=int(stats_row["total_rides"] or 0),
        hours_count=int(hours_count_from_time_dimension(start_date=start_date, end_date=end_date, group_by=StatsGroupBy.NONE).item(0, "hours_count")),
        average_duration_seconds=float(stats_row["average_duration_seconds"] or 0.0),
        average_distance_km=float(stats_row["average_distance_km"] or 0.0),
        total_duration_seconds=float(stats_row["total_duration_seconds"] or 0.0),
        total_distance_km=float(stats_row["total_distance_km"] or 0.0),
        average_speed_kmh=float(stats_row["avg_speed_kmh"] or 0.0),
    )

def _get_grouped_stats(
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> list[GroupedStats]:
    rides = get_filtered_rides(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
        join_distances=True,
    )
    # Add trip_duration to the rides LazyFrame for stats calculations
    rides_lf = to_lazy(add_trip_duration(rides))

    # Define expressions for extracting day_of_week and hour from the started_at timestamp for grouping
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
            average_speed_kmh=float(row.get("avg_speed_kmh") or 0.0),
        )

    # GROUP BY: day_of_week
    if group_by == StatsGroupBy.DAY_OF_WEEK:
        base = build_time_dimension(start_date=start_date, end_date=end_date, base_for_group_by=StatsGroupBy.DAY_OF_WEEK)
        result = _compute_grouped_stats(
            rides_lf,
            base,
            [day_expr],
            ["day_of_week"],
            start_date,
            end_date,
            group_by,
        ).collect()
        return [_make_grouped_stats(row) for row in result.iter_rows(named=True)]

    # GROUP BY: hour
    if group_by == StatsGroupBy.HOUR:
        base = build_time_dimension(start_date=start_date, end_date=end_date, base_for_group_by=StatsGroupBy.HOUR)
        result = _compute_grouped_stats(
            rides_lf,
            base,
            [hour_expr],
            ["hour"],
            start_date,
            end_date,
            group_by,
        ).collect()
        return [_make_grouped_stats(row) for row in result.iter_rows(named=True)]

    # GROUP BY: weather_code
    if group_by == StatsGroupBy.WEATHER_CODE:
        weather_df = load_weather_data().collect()
        # Build hourly spine enriched with weather data
        time_weather = build_time_dimension(
            start_date=start_date,
            end_date=end_date,
            weather_df=weather_df,
            base_for_group_by=None,
        )
        # Get the list of all used weather codes
        base = (
            time_weather
            .select("weather_code")
            .drop_nulls("weather_code")
            .unique()
            .sort("weather_code")
        )
        # Join rides to the hourly weather data to get the weather_code for each ride
        rides_with_weather = (
            rides_lf
            .with_columns(pl.col("started_at").dt.truncate("1h").alias("started_at_hour"))
            .join(
                time_weather.lazy().select([
                    pl.col("started_at").alias("started_at_hour"),
                    "weather_code",
                ]),
                on="started_at_hour",
                how="left",
            )
            .drop("started_at_hour")
        )

        result = _compute_grouped_stats(
            rides_with_weather,
            base,
            [pl.col("weather_code")],
            ["weather_code"],
            start_date,
            end_date,
            group_by,
            weather_df=weather_df,
        ).collect()

        return [_make_grouped_stats(row) for row in result.iter_rows(named=True)]

    # GROUP BY: day_of_week + hour
    if group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        base = build_time_dimension(start_date=start_date, end_date=end_date, base_for_group_by=StatsGroupBy.DAY_OF_WEEK_AND_HOUR)
        result = _compute_grouped_stats(
            rides_lf,
            base,
            [day_expr, hour_expr],
            ["day_of_week", "hour"],
            start_date,
            end_date,
            group_by,
        ).collect()
        return [_make_grouped_stats(row) for row in result.iter_rows(named=True)]

    raise ValueError(f"Unsupported group_by value: {group_by}")