import polars as pl
from datetime import date, datetime, time
from src.backend.loaders.rides_loader import RideFrame
from src.backend.models.stats import (
    StatsGroupBy,
    RideCountGroupBy
)

def to_lazy(df: RideFrame | pl.DataFrame | pl.LazyFrame) -> pl.LazyFrame:
    """Helper to convert a DataFrame to LazyFrame if needed"""
    return df.lazy() if isinstance(df, pl.DataFrame) else df

def build_time_dimension(
    start_date: date,
    end_date: date,
    weather_df: pl.DataFrame | None = None,
    base_for_group_by: StatsGroupBy | None = None,
) -> pl.DataFrame:
    """
    Create a time dimension DataFrame with hourly timestamps between start_date and end_date.
    This allows us to group rides by time periods (day of week, hour) even if there are no rides
    in certain periods, ensuring we get a complete set of time buckets in our stats results.
    """
    # Create a DataFrame with one row per hour in the date range
    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.max)
    df = pl.DataFrame({
        "started_at": pl.datetime_range(
            start=start_dt,
            end=end_dt,
            interval="1h",
            eager=True,
        )
    }).with_columns([
        (pl.col("started_at").dt.weekday() - 1).alias("day_of_week"),
        pl.col("started_at").dt.hour().alias("hour"),
    ])

    # If weather data is provided, join it onto the time dimension so each hour carries its weather_code
    if weather_df is not None:
        df = (
            df
            .sort("started_at")
            .join_asof(
                weather_df.sort("datetime"),
                left_on="started_at",
                right_on="datetime",
                strategy="nearest",
                tolerance="30m",
            )
        )
    # If a time-dimension column is the base for grouping, return the unique values of that column to ensure all groups are represented
    if base_for_group_by is None:
        return df

    if base_for_group_by == StatsGroupBy.DAY_OF_WEEK:
        return df.select("day_of_week").unique().sort("day_of_week")

    if base_for_group_by == StatsGroupBy.HOUR:
        return df.select("hour").unique().sort("hour")

    if base_for_group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        return (
            df.select(["day_of_week", "hour"])
            .unique()
            .sort(["day_of_week", "hour"])
        )
    
    if base_for_group_by == StatsGroupBy.WEATHER_CODE:
        return df.select("weather_code").drop_nulls().unique().sort("weather_code")

    return pl.DataFrame()

def hours_count_from_time_dimension(
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy | RideCountGroupBy,
    weather_df: pl.DataFrame | None = None,
) -> pl.DataFrame:
    """
    Compute the number of hours in the date range for each group bucket, derived from the time
    dimension. This ensures that empty hours are still counted in the hours_count for each group.
    """
    time_dim = build_time_dimension(
        start_date,
        end_date,
        weather_df=weather_df,
    )
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

def attach_hours_count(
    lf: pl.LazyFrame,
    group_cols: list[str],
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy | RideCountGroupBy,
    weather_df: pl.DataFrame | None = None,
) -> pl.LazyFrame:
    """Join the hours_count from the time dimension onto the grouped stats LazyFrame to ensure empty hours are counted correctly."""
    hours_count = hours_count_from_time_dimension(
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
        weather_df=weather_df,
    )
    return (
        lf.join(hours_count.lazy(), on=group_cols, how="left")
        .with_columns(pl.col("hours_count").fill_null(0).cast(pl.Int64))
    )