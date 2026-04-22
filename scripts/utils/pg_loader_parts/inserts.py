import polars as pl

def _insert_stats_hourly(conn, rides: pl.DataFrame) -> None:
    """Aggregate rides by date, hour, user/bike type, and weather code, and insert into stats_hourly."""
    
    # Get the count, total duration, and total distance of rides for each date/hour/user_type/bike_type/weather_code combination
    agg = (
        rides
        .group_by(["date", "hour", "member_casual", "rideable_type", "weather_code"])
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
            r["weather_code"],
            int(r["total_rides"]),
            float(r["total_duration_seconds"] or 0.0),
            float(r["total_distance_km"] or 0.0),
        )
        for r in agg.iter_rows(named=True)
    ]

    # Insert the aggregated stats into the database
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO stats_hourly
                (date, hour, day_of_week, user_type, bike_type, weather_code,
                 total_rides, total_duration_seconds, total_distance_km)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (date, hour, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"    stats_hourly: {len(rows)} rows")


def _insert_station_activity_hourly(conn, rides: pl.DataFrame) -> None:
    """Aggregate rides by date, hour, station, user/bike type, and insert outgoing/incoming counts into station_activity_hourly."""
    
    key_cols = ["date", "hour", "member_casual", "rideable_type"]
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
            r["date"], r["hour"], r["day_of_week"], r["station_id"],
            r["member_casual"], r["rideable_type"],
            int(r["outgoing_rides"]), int(r["incoming_rides"]),
        )
        for r in activity.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO station_activity_hourly
                (date, hour, day_of_week, station_id, user_type, bike_type, outgoing_rides, incoming_rides)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (date, hour, station_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"    station_activity_hourly: {len(rows)} rows")

def _insert_flow_activity_monthly(conn, rides: pl.DataFrame) -> None:
    """Aggregate rides by month, station pair, user/bike type, and insert flow counts into flow_activity_monthly."""
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
        cur.executemany(
            """
            INSERT INTO flow_activity_monthly
                (year, month, station_a_id, station_b_id, user_type, bike_type, a_to_b_count, b_to_a_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (year, month, station_a_id, station_b_id, user_type, bike_type) DO NOTHING
            """,
            rows,
        )
    print(f"    flow_activity_monthly: {len(rows)} rows")

def _upsert_station_metadata(conn, station_info: list[dict]) -> None:
    """Upsert station metadata from GBFS feed into station_metadata table."""
    rows = [
        (s["short_name"], s["name"], s["lat"], s["lon"])
        for s in station_info
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO station_metadata (station_id, station_name, lat, lon)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (station_id) DO NOTHING
            """,
            rows,
        )
    print(f"    station_metadata: {len(rows)} stations upserted")
