import polars as pl

def upsert_bike_routes(conn, df: pl.DataFrame) -> None:
    """
    Upsert bike route segments into bike_routes table.

    Arguments:
    - conn: psycopg2 connection object to the database
    - df: Polars DataFrame containing bike route data with columns:
        - segmentid (int)
        - bikeid (int)
        - status (str, e.g. "Current")
        - instdate (date)
        - ret_date (date or null)
        - the_geom (str)
        - street (str)
        - fromstreet (str)
        - tostreet (str)
        - facilitycl (str)
        - instdate (str in format "%m/%d/%Y")
        - boro (str)
    """
    df = df.with_columns(
        pl.col("instdate").str.strptime(pl.Date, "%m/%d/%Y", strict=False)
    )
    rows = [
        (int(r["segmentid"]), int(r["bikeid"]), r["status"], r["instdate"] ,r["ret_date"], r["the_geom"], r["street"], r["fromstreet"],
         r["tostreet"], r["facilitycl"], r["instdate"], r["boro"])
        for r in df.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO bike_routes
                (segmentid, bikeid, status, installation_date, retired_date, the_geom, street, fromstreet, tostreet, facilitycl, instdate, boro)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (segmentid) DO UPDATE SET
                bikeid     = EXCLUDED.bikeid,
                status     = EXCLUDED.status,
                installation_date = EXCLUDED.installation_date,
                retired_date = EXCLUDED.retired_date,
                the_geom   = EXCLUDED.the_geom,
                street     = EXCLUDED.street,
                fromstreet = EXCLUDED.fromstreet,
                tostreet   = EXCLUDED.tostreet,
                facilitycl = EXCLUDED.facilitycl,
                instdate   = EXCLUDED.instdate,
                boro       = EXCLUDED.boro
            """,
            rows,
        )
    print(f"[DB-LOAD: bike_routes] Upserted {len(rows)} rows")