import logging

import polars as pl
from psycopg2.extras import execute_values

log = logging.getLogger(__name__)

def upsert_bike_routes(conn, df: pl.DataFrame) -> None:
    """Upsert bike-route segments into the bike_routes table.

    `df` is the cleaned DataFrame from `utils.bike_routes.download_bike_routes`.
    Duplicate (segmentid, instdate, status) rows are dropped, keeping the most
    recent occurrence to avoid violating the unique constraint.
    """
    df = df.with_columns(
        pl.col("instdate").str.strptime(pl.Date, "%m/%d/%Y", strict=False)
    )
    df = df.unique(subset=["segmentid", "instdate", "status"], keep="last")

    rows = [
        (int(r["segmentid"]), int(r["bikeid"]), r["status"], r["instdate"], r["ret_date"],
         r["the_geom"], r["street"], r["fromstreet"], r["tostreet"], r["facilitycl"], r["boro"])
        for r in df.iter_rows(named=True)
    ]

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO bike_routes
                (segmentid, bikeid, status, installation_date, retired_date, the_geom, street,
                 fromstreet, tostreet, facilitycl, boro)
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
