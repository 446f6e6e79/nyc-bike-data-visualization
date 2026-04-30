"""Pre-aggregated station activity by month, by hour-of-day, and by day-of-week."""
import logging

import polars as pl
from psycopg2.extras import execute_values

log = logging.getLogger(__name__)

def insert_station_activity_preagg(conn, rides: pl.DataFrame) -> None:
    """Compute and insert all three station-activity pre-aggregations for one month."""
    rides = rides.with_columns([
        pl.col("date").dt.year().cast(pl.Int16).alias("year"),
        pl.col("date").dt.month().cast(pl.Int16).alias("month"),
    ])
    _insert_by_month(conn, rides)
    _insert_by_hour(conn, rides)
    _insert_by_day_of_week(conn, rides)

def _build_activity(rides: pl.DataFrame, group_cols: list[str]) -> pl.DataFrame:
    """Outer-join outgoing/incoming counts on `group_cols + station_id`."""
    outgoing = (
        rides.group_by([*group_cols, "start_station_id"])
        .agg(pl.len().alias("outgoing_rides"))
        .rename({"start_station_id": "station_id"})
    )
    incoming = (
        rides.group_by([*group_cols, "end_station_id"])
        .agg(pl.len().alias("incoming_rides"))
        .rename({"end_station_id": "station_id"})
    )
    return (
        outgoing.join(incoming, on=[*group_cols, "station_id"], how="full", coalesce=True)
        .with_columns([
            pl.col("outgoing_rides").fill_null(0),
            pl.col("incoming_rides").fill_null(0),
        ])
    )

def _insert_by_month(conn, rides: pl.DataFrame) -> None:
    activity = _build_activity(rides, ["year", "month", "member_casual", "rideable_type"])
    rows = [
        (int(r["year"]), int(r["month"]), r["station_id"], r["member_casual"], r["rideable_type"],
         int(r["outgoing_rides"]), int(r["incoming_rides"]))
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO station_activity_by_month
                (year, month, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES %s
            ON CONFLICT (year, month, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    log.info(f"[DB-LOAD: station_activity_by_month] Inserted {len(rows)} rows")

def _insert_by_hour(conn, rides: pl.DataFrame) -> None:
    activity = _build_activity(rides, ["year", "month", "hour", "member_casual", "rideable_type"])
    rows = [
        (int(r["year"]), int(r["month"]), int(r["hour"]), r["station_id"], r["member_casual"], r["rideable_type"],
         int(r["outgoing_rides"]), int(r["incoming_rides"]))
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO station_activity_by_hour
                (year, month, hour, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES %s
            ON CONFLICT (year, month, hour, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    log.info(f"[DB-LOAD: station_activity_by_hour] Inserted {len(rows)} rows")

def _insert_by_day_of_week(conn, rides: pl.DataFrame) -> None:
    activity = _build_activity(rides, ["year", "month", "day_of_week", "member_casual", "rideable_type"])
    rows = [
        (int(r["year"]), int(r["month"]), int(r["day_of_week"]), r["station_id"], r["member_casual"], r["rideable_type"],
         int(r["outgoing_rides"]), int(r["incoming_rides"]))
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO station_activity_by_dow
                (year, month, day_of_week, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES %s
            ON CONFLICT (year, month, day_of_week, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    log.info(f"[DB-LOAD: station_activity_by_dow] Inserted {len(rows)} rows")
