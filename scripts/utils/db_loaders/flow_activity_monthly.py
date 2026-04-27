import polars as pl
from psycopg2.extras import execute_values

def insert_flow_activity_monthly(conn, rides: pl.DataFrame) -> None:
    """
    Compute and insert monthly flow activity between station pairs into flow_activity_monthly table.

    Arguments:
    - conn: psycopg2 connection object to the database
    - rides: Polars DataFrame containing ride data with columns:
        - date (datetime)
        - start_station_id (int)
        - end_station_id (int)
        - member_casual (str)
        - rideable_type (str)
    """
    flow = (
        rides
        .with_columns([
            pl.col("date").dt.year().cast(pl.Int16).alias("year"),
            pl.col("date").dt.month().cast(pl.Int16).alias("month"),
            pl.min_horizontal("start_station_id", "end_station_id").alias("station_a_id"),
            pl.max_horizontal("start_station_id", "end_station_id").alias("station_b_id"),
            (pl.col("start_station_id") <= pl.col("end_station_id")).alias("_is_a_to_b"),
        ])
        .group_by(["year", "month", "station_a_id", "station_b_id", "member_casual", "rideable_type", "_is_a_to_b"])
        .agg(pl.len().alias("count"))
    )
    key_cols = ["year", "month", "station_a_id", "station_b_id", "member_casual", "rideable_type"]
    a_to_b = flow.filter(pl.col("_is_a_to_b")).drop("_is_a_to_b").rename({"count": "a_to_b_count"})
    b_to_a = flow.filter(~pl.col("_is_a_to_b")).drop("_is_a_to_b").rename({"count": "b_to_a_count"})
    merged = (
        a_to_b
        .join(b_to_a, on=key_cols, how="full", coalesce=True)
        .with_columns([
            pl.col("a_to_b_count").fill_null(0),
            pl.col("b_to_a_count").fill_null(0),
        ])
    )
    rows = [
        (
            int(r["year"]), int(r["month"]), r["station_a_id"], r["station_b_id"],
            r["member_casual"], r["rideable_type"],
            int(r["a_to_b_count"]), int(r["b_to_a_count"]),
        )
        for r in merged.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO flow_activity_monthly
                (year, month, station_a_id, station_b_id, user_type, bike_type, a_to_b_count, b_to_a_count)
            VALUES %s
            ON CONFLICT (year, month, station_a_id, station_b_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"[DB-LOAD: flow_activity_monthly] Inserted {len(rows)} rows")