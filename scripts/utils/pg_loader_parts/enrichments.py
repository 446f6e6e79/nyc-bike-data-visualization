import polars as pl

def _enrich_with_distances(rides: pl.LazyFrame, distances: pl.LazyFrame) -> pl.LazyFrame:
    rides_norm = rides.with_columns([
        pl.min_horizontal("start_station_id", "end_station_id").alias("_station_min"),
        pl.max_horizontal("start_station_id", "end_station_id").alias("_station_max"),
    ])
    distances_sel = distances.select([
        pl.col("station_id_a").alias("_station_min"),
        pl.col("station_id_b").alias("_station_max"),
        "distance_km",
    ])
    return (
        rides_norm
        .join(distances_sel, on=["_station_min", "_station_max"], how="left")
        .drop(["_station_min", "_station_max"])
    )

def _enrich_with_weather_code(rides: pl.LazyFrame, weather: pl.LazyFrame) -> pl.LazyFrame:
    weather_hourly = weather.select([
        pl.col("datetime").dt.truncate("1h").alias("_hour_ts"),
        pl.col("weather_code"),
    ])
    return (
        rides
        .with_columns(pl.col("started_at").dt.truncate("1h").alias("_hour_ts"))
        .join(weather_hourly, on="_hour_ts", how="left")
        .drop("_hour_ts")
    )
