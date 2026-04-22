import polars as pl

def insert_station_activity_hourly(conn, rides: pl.DataFrame) -> None:
    """
    Compute and insert hourly station activity (outgoing/incoming rides) into station_activity_hourly table.
    Arguments:
        - conn: psycopg2 connection object to the database
        - rides: Polars DataFrame containing ride data with columns:
            - date (datetime)
            - hour (int)
            - day_of_week (int)
            - start_station_id (int)
            - end_station_id (int)
            - member_casual (str)
            - rideable_type (str)
    """
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
        cur.executemany(
            """
            INSERT INTO station_activity_hourly
                (year, month, day_of_week, hour, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
    print(f"    station_activity_hourly: {len(rows)} rows")