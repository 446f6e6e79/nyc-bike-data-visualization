import logging

import polars as pl
from psycopg2.extras import execute_values

log = logging.getLogger(__name__)

def insert_station_activity_hourly(conn, rides: pl.DataFrame) -> None:
    """Insert per-station outgoing/incoming ride counts grouped by (year, month, dow, hour, user, bike)."""
    rides = rides.with_columns([
        pl.col("date").dt.year().cast(pl.Int16).alias("year"),
        pl.col("date").dt.month().cast(pl.Int16).alias("month"),
    ])
    key_cols = ["year", "month", "day_of_week", "hour", "member_casual", "rideable_type"]

    outgoing = (
        rides
        .group_by([*key_cols, "start_station_id"])
        .agg(pl.len().alias("outgoing_rides"))
        .rename({"start_station_id": "station_id"})
    )
    incoming = (
        rides
        .group_by([*key_cols, "end_station_id"])
        .agg(pl.len().alias("incoming_rides"))
        .rename({"end_station_id": "station_id"})
    )
    activity = (
        outgoing
        .join(incoming, on=[*key_cols, "station_id"], how="full", coalesce=True)
        .with_columns([
            pl.col("outgoing_rides").fill_null(0),
            pl.col("incoming_rides").fill_null(0),
        ])
    )
    rows = [
        (
            int(r["year"]), int(r["month"]), int(r["day_of_week"]), int(r["hour"]),
            r["station_id"], r["member_casual"], r["rideable_type"],
            int(r["outgoing_rides"]), int(r["incoming_rides"]),
        )
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO station_activity_hourly
                (year, month, day_of_week, hour, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES %s
            ON CONFLICT (year, month, day_of_week, hour, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    log.info(f"[DB-LOAD: station_activity_hourly] Inserted {len(rows)} rows")
