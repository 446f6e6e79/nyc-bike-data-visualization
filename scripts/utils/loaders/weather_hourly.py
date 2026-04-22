import polars as pl

def upsert_weather_hourly(conn, weather_df: pl.DataFrame) -> None:
    """
    Upsert hourly weather data into weather_hourly table.
    Arguments:
        - conn: psycopg2 connection object to the database
        - weather_df: Polars DataFrame containing weather data with columns:
            - datetime (datetime)
            - weather_code (int)
            - temperature_2m (float)
            - precipitation (float)
            - wind_speed_10m (float)
    """
    if weather_df.is_empty():
        print("    weather_hourly: 0 rows upserted")
        return

    weather_hourly = (
        weather_df
        .with_columns([
            pl.col("datetime").dt.date().alias("date"),
            pl.col("datetime").dt.hour().cast(pl.Int16).alias("hour"),
        ])
        .select([
            "date",
            "hour",
            pl.col("weather_code").cast(pl.Int16),
            pl.col("temperature_2m").cast(pl.Float64),
            pl.col("precipitation").cast(pl.Float64),
            pl.col("wind_speed_10m").cast(pl.Float64),
        ])
        .unique(subset=["date", "hour"], keep="last")
    )

    rows = [
        (
            r["date"],
            int(r["hour"]),
            int(r["weather_code"]) if r["weather_code"] is not None else None,
            float(r["temperature_2m"]) if r["temperature_2m"] is not None else None,
            float(r["precipitation"]) if r["precipitation"] is not None else None,
            float(r["wind_speed_10m"]) if r["wind_speed_10m"] is not None else None,
        )
        for r in weather_hourly.iter_rows(named=True)
    ]

    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO weather_hourly
                (date, hour, weather_code, temperature_2m, precipitation, wind_speed_10m)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
    print(f"    weather_hourly: {len(rows)} rows upserted")