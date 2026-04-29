import logging

from psycopg2.extras import execute_values

log = logging.getLogger(__name__)

def upsert_station_metadata(conn, station_info: list[dict]) -> None:
    """Upsert station metadata from the GBFS feed into station_metadata."""
    rows = [
        (s["short_name"], s["name"], s["lat"], s["lon"])
        for s in station_info
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO station_metadata (station_id, station_name, lat, lon)
            VALUES %s
            ON CONFLICT (station_id) DO NOTHING
            """,
            rows,
        )
    log.info(f"[DB-LOAD: station_metadata] Upserted {len(rows)} stations")
