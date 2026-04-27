"""Seed the database with fixture data for integration testing.

Run from the project root:
    python scripts/load_test_data.py
"""
import os
import sys
from pathlib import Path

import polars as pl
import psycopg2

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from utils.pg_loader import init_db
from utils.db_loaders.hourly_stats import insert_stats_hourly
from utils.db_loaders.station_activity_hourly import insert_station_activity_hourly
from utils.db_loaders.station_activity_preagg import insert_station_activity_preagg
from utils.db_loaders.flow_activity_monthly import insert_flow_activity_monthly
from utils.db_loaders.station_metadata import upsert_station_metadata
from utils.db_loaders.weather_hourly import upsert_weather_hourly
from src.backend.config import TEST_DATA_DIR

def _build_rides(trips_path: Path, distances_path: Path) -> pl.DataFrame:
    trips = pl.read_csv(trips_path, try_parse_dates=True)
    distances = pl.read_csv(distances_path)

    # Normalise pair so (A,B) and (B,A) both match — same logic as enrich_with_distances
    trips = trips.with_columns([
        pl.min_horizontal("start_station_id", "end_station_id").alias("_min"),
        pl.max_horizontal("start_station_id", "end_station_id").alias("_max"),
    ])
    dist_norm = distances.rename({"station_id_a": "_min", "station_id_b": "_max"})

    return (
        trips
        .join(dist_norm, on=["_min", "_max"], how="left")
        .drop(["_min", "_max"])
        .with_columns([
            pl.col("started_at").dt.date().alias("date"),
            pl.col("started_at").dt.hour().cast(pl.Int16).alias("hour"),
            (pl.col("started_at").dt.weekday() - 1).cast(pl.Int16).alias("day_of_week"),
            (
                (pl.col("ended_at") - pl.col("started_at")).dt.total_seconds()
            ).cast(pl.Float64).alias("trip_duration_seconds"),
            pl.col("distance_km").fill_null(0.0),
        ])
    )


def _station_metadata(trips: pl.DataFrame) -> list[dict]:
    starts = trips.select([
        pl.col("start_station_id").alias("short_name"),
        pl.col("start_station_name").alias("name"),
        pl.col("start_lat").alias("lat"),
        pl.col("start_lng").alias("lon"),
    ])
    ends = trips.select([
        pl.col("end_station_id").alias("short_name"),
        pl.col("end_station_name").alias("name"),
        pl.col("end_lat").alias("lat"),
        pl.col("end_lng").alias("lon"),
    ])
    return pl.concat([starts, ends]).unique(subset=["short_name"]).to_dicts()


def main() -> None:
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        init_db(conn)

        trips_raw = pl.read_csv(TEST_DATA_DIR / "trips.csv", try_parse_dates=True)
        upsert_station_metadata(conn, _station_metadata(trips_raw))
        conn.commit()

        rides = _build_rides(TEST_DATA_DIR / "trips.csv", TEST_DATA_DIR / "distances.csv")
        insert_stats_hourly(conn, rides)
        insert_station_activity_hourly(conn, rides)
        insert_station_activity_preagg(conn, rides)
        insert_flow_activity_monthly(conn, rides)
        conn.commit()

        weather_df = pl.read_csv(TEST_DATA_DIR / "weather.csv", try_parse_dates=True)
        upsert_weather_hourly(conn, weather_df)
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO dataset_coverage (id, min_date, max_date)
                SELECT 1, MIN(date), MAX(date) FROM stats_hourly
                ON CONFLICT (id) DO UPDATE
                SET min_date = EXCLUDED.min_date, max_date = EXCLUDED.max_date
            """)
        conn.commit()
        print("[DB] Test data loaded successfully")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
