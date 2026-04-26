import polars as pl


def insert_station_activity_preagg(conn, rides: pl.DataFrame) -> None:
    rides = rides.with_columns([
        pl.col("date").dt.year().cast(pl.Int16).alias("year"),
        pl.col("date").dt.month().cast(pl.Int16).alias("month"),
    ])
    _insert_by_month(conn, rides)
    _insert_by_hour(conn, rides)
    _insert_by_dow(conn, rides)


def _build_activity(rides: pl.DataFrame, key_cols: list[str]) -> pl.DataFrame:
    outgoing = (
        rides.group_by([*key_cols, "start_station_id"])
        .agg(pl.len().alias("outgoing_rides"))
        .rename({"start_station_id": "station_id"})
    )
    incoming = (
        rides.group_by([*key_cols, "end_station_id"])
        .agg(pl.len().alias("incoming_rides"))
        .rename({"end_station_id": "station_id"})
    )
    return (
        outgoing.join(incoming, on=[*key_cols, "station_id"], how="full", coalesce=True)
        .with_columns([pl.col("outgoing_rides").fill_null(0), pl.col("incoming_rides").fill_null(0)])
    )


def _insert_by_month(conn, rides: pl.DataFrame) -> None:
    activity = _build_activity(rides, ["year", "month", "member_casual", "rideable_type"])
    rows = [
        (int(r["year"]), int(r["month"]), r["station_id"], r["member_casual"], r["rideable_type"],
         int(r["outgoing_rides"]), int(r["incoming_rides"]))
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO station_activity_by_month
                (year, month, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (year, month, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"[DB-LOAD: station_activity_by_month] Inserted {len(rows)} rows")


def _insert_by_hour(conn, rides: pl.DataFrame) -> None:
    activity = _build_activity(rides, ["year", "month", "hour", "member_casual", "rideable_type"])
    rows = [
        (int(r["year"]), int(r["month"]), int(r["hour"]), r["station_id"], r["member_casual"], r["rideable_type"],
         int(r["outgoing_rides"]), int(r["incoming_rides"]))
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO station_activity_by_hour
                (year, month, hour, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (year, month, hour, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"[DB-LOAD: station_activity_by_hour] Inserted {len(rows)} rows")


def _insert_by_dow(conn, rides: pl.DataFrame) -> None:
    activity = _build_activity(rides, ["year", "month", "day_of_week", "member_casual", "rideable_type"])
    rows = [
        (int(r["year"]), int(r["month"]), int(r["day_of_week"]), r["station_id"], r["member_casual"], r["rideable_type"],
         int(r["outgoing_rides"]), int(r["incoming_rides"]))
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO station_activity_by_dow
                (year, month, day_of_week, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (year, month, day_of_week, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"[DB-LOAD: station_activity_by_dow] Inserted {len(rows)} rows")
