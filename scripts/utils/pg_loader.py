import logging
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl
import psycopg2

from config import RIDES_DATA_DIR, STATION_DISTANCES_PATH, WEATHER_DATA_DIR
from utils.distances import enrich_with_distances
from utils.stations import download_station_metadata
from utils.db_loaders.flow_activity_monthly import insert_flow_activity_monthly
from utils.db_loaders.hourly_stats import insert_stats_hourly
from utils.db_loaders.station_activity_hourly import insert_station_activity_hourly
from utils.db_loaders.station_activity_preagg import insert_station_activity_preagg
from utils.db_loaders.station_metadata import upsert_station_metadata
from utils.db_loaders.weather_hourly import upsert_weather_hourly

log = logging.getLogger(__name__)

_SCHEMA_DIR = Path(__file__).resolve().parents[2] / "postgres" / "schemas"

def init_db(conn) -> None:
    """Apply every postgres/schemas/*.sql file in alphabetical order."""
    schema_files = sorted(_SCHEMA_DIR.glob("*.sql"))
    if not schema_files:
        raise FileNotFoundError(f"No schema SQL files found in {_SCHEMA_DIR}")

    with conn.cursor() as cur:
        for sql_file in schema_files:
            cur.execute(sql_file.read_text())
            log.info(f"[DB] Applied schema: {sql_file.name}")
    conn.commit()
    log.info("[DB] Schema initialised")

def _load_rides_partition(year: int, month: int) -> pl.DataFrame:
    """Scan the parquet partition for `(year, month)` and join distances if available.
    Returns a materialised DataFrame since we'll be reusing it for multiple inserts.
    """
    partition_path = RIDES_DATA_DIR / f"year={year}" / f"month={month}"
    rides_lf = pl.scan_parquet(str(partition_path / "*.parquet"))

    if STATION_DISTANCES_PATH.exists():
        rides_lf = enrich_with_distances(rides_lf, pl.scan_parquet(str(STATION_DISTANCES_PATH)))
    else:
        log.warning(f"[WARN] {STATION_DISTANCES_PATH} not found, skipping distance enrichment")
        rides_lf = rides_lf.with_columns(pl.lit(None).cast(pl.Float32).alias("distance_km"))

    return rides_lf.collect()

# Functions to compute and insert all the different stats tables for a given month.
# Each function can be executed in parallel since they write to different tables.
_PER_MONTH_LOADERS = (
    insert_stats_hourly,
    insert_station_activity_hourly,
    insert_station_activity_preagg,
    insert_flow_activity_monthly,
)

def load_stats_for_month(conn, year: int, month: int, db_loader_workers: int) -> None:
    """Precompute and insert all per-month stats tables for `(year, month)`."""
    tag = f"{year}-{month:02d}"
    log.info(f"[DB] Loading {tag}...")

    rides = _load_rides_partition(year, month)
    log.info(f"[PROCESS] {len(rides)} rides — computing aggregations")

    def _run(insert_fn) -> None:
        pconn = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            insert_fn(pconn, rides)
            pconn.commit()
        finally:
            pconn.close()

    inner_workers = max(1, db_loader_workers)
    with ThreadPoolExecutor(max_workers=inner_workers, thread_name_prefix="db-insert") as pool:
        for future in [pool.submit(_run, fn) for fn in _PER_MONTH_LOADERS]:
            future.result()

    conn.commit()
    log.info(f"[DB] {tag} committed")

def load_weather_hourly(conn) -> None:
    """Load every weather parquet partition into the weather_hourly table."""
    if not WEATHER_DATA_DIR.exists() or not any(WEATHER_DATA_DIR.rglob("*.parquet")):
        log.warning(f"[WARN] No weather data found in {WEATHER_DATA_DIR}, skipping")
        return

    weather_df = pl.scan_parquet(str(WEATHER_DATA_DIR / "**/*.parquet"), hive_partitioning=True).collect()
    upsert_weather_hourly(conn, weather_df)
    conn.commit()

def upsert_station_metadata_from_gbfs(conn, force_download: bool = False) -> None:
    """Refresh station_metadata from the GBFS feed, using the parquet cache when fresh."""
    station_info = download_station_metadata(force_download=force_download)
    upsert_station_metadata(conn, station_info)
    conn.commit()

def assert_no_coverage_gaps(conn) -> None:
    """Raise ValueError if stats_hourly is missing any month between its min and max date."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT EXTRACT(YEAR FROM date)::int, EXTRACT(MONTH FROM date)::int
            FROM stats_hourly
            GROUP BY 1, 2
            ORDER BY 1, 2
        """)
        loaded = [(r[0], r[1]) for r in cur.fetchall()]

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
    """Refresh dataset_coverage with the current min/max date in stats_hourly."""
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
    """Return all months present in stats_hourly as YYYYMM ints."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT EXTRACT(YEAR FROM date)::int, EXTRACT(MONTH FROM date)::int
            FROM stats_hourly
            GROUP BY 1, 2
        """)
        return [y * 100 + m for y, m in cur.fetchall()]
