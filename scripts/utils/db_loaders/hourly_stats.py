import logging
import polars as pl
from psycopg2.extras import execute_values

log = logging.getLogger(__name__)


def insert_stats_hourly(conn, rides: pl.DataFrame) -> None:
    """
    Compute and insert hourly stats into stats_hourly table.
    Arguments:
        - conn: psycopg2 connection object to the database
        - rides: Polars DataFrame containing ride data with columns:
            - date (datetime)
            - hour (int)
            - day_of_week (int)
            - member_casual (str)
            - rideable_type (str)
    """    
    # Get the count, total duration, and total distance of rides for each date/hour/user_type/bike_type combination
    agg = (
        rides
        .group_by(["date", "hour", "day_of_week", "member_casual", "rideable_type"])
        .agg([
            pl.len().alias("total_rides"),
            pl.col("trip_duration_seconds").sum().alias("total_duration_seconds"),
            pl.col("distance_km").sum().alias("total_distance_km"),
        ])
    )
    
    # Convert the aggregated results to a list of tuples for insertion, ensuring proper types and handling nulls
    rows = [
        (
            r["date"], r["hour"], r["day_of_week"], r["member_casual"], r["rideable_type"],
            int(r["total_rides"]),
            float(r["total_duration_seconds"] or 0.0),
            float(r["total_distance_km"] or 0.0),
        )
        for r in agg.iter_rows(named=True)
    ]

    # Insert the aggregated stats into the database
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO stats_hourly
                (date, hour, day_of_week, user_type, bike_type,
                 total_rides, total_duration_seconds, total_distance_km)
            VALUES %s
            ON CONFLICT (date, hour, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    log.info(f"[DB-LOAD: stats_hourly] Inserted {len(rows)} rows")