"""
Precompute per-month ride stats and bulk-load them into PostgreSQL.
Replaces daily_stats.py — writes three tables:
  stats_hourly, station_activity_hourly, flow_activity_monthly
plus station_metadata and dataset_coverage.
"""
from datetime import date

import polars as pl

from src.backend.config import RIDES_DATA_DIR, STATION_DISTANCES_PATH, WEATHER_DATA_DIR
from src.backend.services.gbfs import fetch_station_data
from utils.pg_loader_parts.enrichments import _enrich_with_distances, _enrich_with_weather_code
from utils.pg_loader_parts.inserts import (
	_insert_flow_activity_monthly,
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
	schema_dir = __import__("pathlib").Path(__file__).resolve().parents[1] / "postgre" / "schemas"
	
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
		print(f"Warning: {STATION_DISTANCES_PATH} not found, skipping distance enrichment.")
		rides_lf = rides_lf.with_columns(pl.lit(None).cast(pl.Float32).alias("distance_km"))

	if WEATHER_DATA_DIR.exists() and any(WEATHER_DATA_DIR.rglob("*.parquet")):
		weather = pl.scan_parquet(str(WEATHER_DATA_DIR / "**/*.parquet"), hive_partitioning=True)
		rides_lf = _enrich_with_weather_code(rides_lf, weather)
	else:
		print(f"Warning: No weather data found in {WEATHER_DATA_DIR}, skipping weather enrichment.")
		rides_lf = rides_lf.with_columns(pl.lit(None).cast(pl.Int16).alias("weather_code"))

	rides_lf = rides_lf.with_columns([
		# Use the end time for date/hour to reflect the provider's choice of when a ride counts towards usage stats
		pl.col("ended_at").dt.date().alias("date"),
		pl.col("ended_at").dt.hour().cast(pl.Int16).alias("hour"),
		(pl.col("ended_at") - pl.col("started_at"))
			.dt.total_seconds()
			.alias("trip_duration_seconds"),
	])

	rides = rides_lf.collect()
	print(f"  {len(rides)} rides — computing aggregations...")

	_insert_stats_hourly(conn, rides)
	_insert_station_activity_hourly(conn, rides)
	_insert_flow_activity_monthly(conn, rides)
	conn.commit()
	print(f"  Done — {year}-{month:02d} committed.")


def upsert_station_metadata_from_gbfs(conn) -> None:
	"""Fetch current station list from GBFS and upsert into station_metadata."""
	station_info, _ = fetch_station_data(force_refresh=True)
	_upsert_station_metadata(conn, station_info)
	conn.commit()


def assert_no_coverage_gaps(conn) -> None:
	"""Raise ValueError if stats_hourly has missing months between its min and max date."""
	with conn.cursor() as cur:
		cur.execute("""
			SELECT EXTRACT(YEAR FROM date)::int, EXTRACT(MONTH FROM date)::int
			FROM stats_hourly
			GROUP BY 1, 2
			ORDER BY 1, 2
		""")
		loaded = [(r[0], r[1]) for r in cur.fetchall()]

	if len(loaded) < 2:
		return

	(min_y, min_m), (max_y, max_m) = loaded[0], loaded[-1]
	loaded_set = set(loaded)

	missing = []
	y, m = min_y, min_m
	while (y, m) <= (max_y, max_m):
		if (y, m) not in loaded_set:
			missing.append(f"{y}-{m:02d}")
		m += 1
		if m > 12:
			y, m = y + 1, 1

	if missing:
		raise ValueError(
			f"Dataset has gaps — missing months: {', '.join(missing)}. "
			"Re-run the script with a wider date range to fill them."
		)


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

def get_loaded_months(conn) -> list[int]:
    """Return all months already present in stats_hourly as a list of YYYYMM integers."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT EXTRACT(YEAR FROM date)::int, EXTRACT(MONTH FROM date)::int
            FROM stats_hourly
            GROUP BY 1, 2
        """)
        return [y * 100 + m for y, m in cur.fetchall()]


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