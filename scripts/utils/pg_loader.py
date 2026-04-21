"""
Precompute per-month ride stats and bulk-load them into PostgreSQL.
Replaces daily_stats.py — writes three tables:
  stats_hourly, station_activity_hourly, flow_activity_daily
plus station_metadata and dataset_coverage.
"""
from datetime import date

import polars as pl

from src.backend.config import RIDES_DATA_DIR, STATION_DISTANCES_PATH, WEATHER_DATA_DIR
from utils.pg_loader_parts.enrichments import _enrich_with_distances, _enrich_with_weather_code
from utils.pg_loader_parts.inserts import (
	_insert_flow_activity_daily,
	_insert_station_activity_hourly,
	_insert_stats_hourly,
	_upsert_station_metadata,
)

def init_db(conn) -> None:
	"""
	Initialize the database schema by executing ordered SQL files from scripts/postgre/schemas.
	Args:
		conn: psycopg2 connection object to the target database
	"""
	schema_dir = __import__("pathlib").Path(schema_dir).resolve().parents[1] / "postgre" / "schemas"
	
    # Get all files in the schema directory, sorted alphabetically 
	schema_files = sorted(schema_dir.glob("*.sql"))
	if not schema_files:
		raise FileNotFoundError(f"No schema SQL files found in {schema_dir}")

	with conn.cursor() as cur:
		for sql_file in schema_files:
			cur.execute(sql_file.read_text())
			print(f"Applied schema file: {sql_file.name}")
	conn.commit()
	print(f"Database schema initialised from {schema_dir}.")


def load_stats_for_month(conn, year: int, month: int) -> None:
	"""Precompute and insert all stats tables for a single calendar month.
	Skips the month if it is already present in stats_hourly."""
	if _is_month_loaded(conn, year, month):
		print(f"Stats for {year}-{month:02d} already loaded, skipping.")
		return

	print(f"Precomputing stats for {year}-{month:02d}...")

	partition_path = RIDES_DATA_DIR / f"year={year}" / f"month={month}"
	rides_lf = pl.scan_parquet(str(partition_path / "*.parquet"))

	if STATION_DISTANCES_PATH.exists():
		rides_lf = _enrich_with_distances(rides_lf, pl.scan_parquet(str(STATION_DISTANCES_PATH)))
	else:
		rides_lf = rides_lf.with_columns(pl.lit(None).cast(pl.Float64).alias("distance_km"))

	if WEATHER_DATA_DIR.exists() and any(WEATHER_DATA_DIR.rglob("*.parquet")):
		weather = pl.scan_parquet(str(WEATHER_DATA_DIR / "**/*.parquet"), hive_partitioning=True)
		rides_lf = _enrich_with_weather_code(rides_lf, weather)
	else:
		rides_lf = rides_lf.with_columns(pl.lit(None).cast(pl.Int16).alias("weather_code"))

	rides_lf = rides_lf.with_columns([
		pl.col("started_at").dt.date().alias("date"),
		pl.col("started_at").dt.hour().cast(pl.Int16).alias("hour"),
		(pl.col("ended_at") - pl.col("started_at"))
			.dt.total_seconds()
			.alias("trip_duration_seconds"),
	])

	rides = rides_lf.collect()
	print(f"  {len(rides)} rides — computing aggregations...")

	_insert_stats_hourly(conn, rides)
	_insert_station_activity_hourly(conn, rides)
	_insert_flow_activity_daily(conn, rides)
	_upsert_station_metadata(conn, rides)
	conn.commit()
	print(f"  Done — {year}-{month:02d} committed.")


def update_dataset_coverage(conn) -> None:
	"""Derive min/max dates from stats_hourly and write to dataset_coverage."""
	with conn.cursor() as cur:
		cur.execute("""
			INSERT INTO dataset_coverage (id, min_date, max_date)
			SELECT 1, MIN(date), MAX(date) FROM stats_hourly
			ON CONFLICT (id) DO UPDATE SET
				min_date = EXCLUDED.min_date,
				max_date = EXCLUDED.max_date
		""")
	conn.commit()

def _is_month_loaded(conn, year: int, month: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT EXISTS(
                SELECT 1
                FROM stats_hourly
                WHERE date >= %s
                  AND date < %s
                LIMIT 1
            )
            """,
            (date(year, month, 1), date(year, month % 12 + 1, 1) if month < 12 else date(year + 1, 1, 1)),
        )
        return cur.fetchone()[0]