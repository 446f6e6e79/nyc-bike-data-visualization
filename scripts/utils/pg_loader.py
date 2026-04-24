"""
Precompute per-month ride stats and bulk-load them into PostgreSQL.
Replaces daily_stats.py — writes three tables:
  stats_hourly, station_activity_hourly, flow_activity_monthly
plus station_metadata and dataset_coverage.
"""
import polars as pl

from src.backend.config import RIDES_DATA_DIR, STATION_DISTANCES_PATH, WEATHER_DATA_DIR
from src.backend.services.gbfs import fetch_station_data
from utils.distances import enrich_with_distances
from utils.db_loaders.flow_activity_monthly import insert_flow_activity_monthly
from utils.db_loaders.hourly_stats import insert_stats_hourly
from utils.db_loaders.station_activity_hourly import insert_station_activity_hourly
from utils.db_loaders.station_metadata import upsert_station_metadata
from utils.db_loaders.weather_hourly import upsert_weather_hourly

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
	"""Precompute and insert all stats tables for a single calendar month.."""
	
	print(f"Precomputing stats for {year}-{month:02d}...")
	partition_path = RIDES_DATA_DIR / f"year={year}" / f"month={month}"
	rides_lf = pl.scan_parquet(str(partition_path / "*.parquet"))

    # Check if the distance lf is present, join it to rides
	if STATION_DISTANCES_PATH.exists():
		rides_lf = enrich_with_distances(rides_lf, pl.scan_parquet(str(STATION_DISTANCES_PATH)))
	else:
		print(f"Warning: {STATION_DISTANCES_PATH} not found, skipping distance enrichment.")
		rides_lf = rides_lf.with_columns(pl.lit(None).cast(pl.Float32).alias("distance_km"))

    # Collect the enriched rides data into memory for aggregation and insertion
	rides = rides_lf.collect()
	print(f"  {len(rides)} rides — computing aggregations...")

	insert_stats_hourly(conn, rides)
	insert_station_activity_hourly(conn, rides)
	insert_flow_activity_monthly(conn, rides)
	conn.commit()
	print(f"  Done — {year}-{month:02d} committed.")

def load_weather_hourly(conn) -> None:
	"""Load hourly weather parquet data into weather_hourly table."""
	if not WEATHER_DATA_DIR.exists() or not any(WEATHER_DATA_DIR.rglob("*.parquet")):
		print(f"Warning: No weather data found in {WEATHER_DATA_DIR}, skipping weather_hourly load.")
		return

	weather_df = pl.scan_parquet(str(WEATHER_DATA_DIR / "**/*.parquet"), hive_partitioning=True).collect()
	upsert_weather_hourly(conn, weather_df)
	conn.commit()

def upsert_station_metadata_from_gbfs(conn) -> None:
	"""Fetch current station list from GBFS and upsert into station_metadata."""
	station_info, _ = fetch_station_data(force_refresh=True)
	upsert_station_metadata(conn, station_info)
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
		# Create a sorted list of (year, month) tuples representing loaded months
		loaded = [(r[0], r[1]) for r in cur.fetchall()]

    # Get the min and max year-month
	(min_y, min_m), (max_y, max_m) = loaded[0], loaded[-1]
	loaded_set = set(loaded)

	missing = []
	# Iterate from min to max year-month, checking for any missing months in loaded_set
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