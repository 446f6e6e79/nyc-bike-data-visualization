import polars as pl
from psycopg2.extras import execute_values
import logging

log = logging.getLogger(__name__)

def upsert_bike_routes(conn, df: pl.DataFrame) -> None:
    """
    Upsert bike route segments into bike_routes table.

    Arguments:
    - conn: psycopg2 connection object to the database
    - df: Polars DataFrame containing bike route data with columns:
        - segmentid (int)
        - bikeid (int)
        - status (str, e.g. "Current")
        - instdate (str in format "%m/%d/%Y")
        - ret_date (date or null)
        - the_geom (str)
        - street (str)
        - fromstreet (str)
        - tostreet (str)
        - facilitycl (str)
        - boro (str)
    """
    df = df.with_columns(
        pl.col("instdate").str.strptime(pl.Date, "%m/%d/%Y", strict=False)
    )
    # Remove duplicates based on segmentid, instdate, and status to avoid 
    # violating the unique constraint on upsert, keeping the last occurrence (most recent data)
    df = df.unique(subset=["segmentid", "instdate", "status"], keep="last")

    rows = [
        (int(r["segmentid"]), int(r["bikeid"]), r["status"], r["instdate"] ,r["ret_date"], r["the_geom"], r["street"], r["fromstreet"],
         r["tostreet"], r["facilitycl"], r["boro"])
        for r in df.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO bike_routes
                (segmentid, bikeid, status, installation_date, retired_date, the_geom, street, fromstreet, tostreet, facilitycl, boro)
            VALUES %s
            ON CONFLICT (segmentid, installation_date, status) DO UPDATE SET
                bikeid     = EXCLUDED.bikeid,
                status     = EXCLUDED.status,
                installation_date = EXCLUDED.installation_date,
                retired_date = EXCLUDED.retired_date,
                the_geom   = EXCLUDED.the_geom,
                street     = EXCLUDED.street,
                fromstreet = EXCLUDED.fromstreet,
                tostreet   = EXCLUDED.tostreet,
                facilitycl = EXCLUDED.facilitycl,
                boro       = EXCLUDED.boro
            """,
            rows,
        )
    log.info(f"[DB-LOAD: bike_routes] Upserted {len(rows)} rows")