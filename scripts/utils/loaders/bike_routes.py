import polars as pl

def upsert_bike_routes(conn, df: pl.DataFrame) -> None:
    """
    Upsert bike route segments into bike_routes table.

    Arguments:
    - conn: psycopg2 connection object to the database
    - df: Polars DataFrame containing bike route data with columns:
        - segmentid (int)
        - bikeid (int)
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
        (int(r["segmentid"]), int(r["bikeid"]), r["the_geom"], r["street"], r["fromstreet"],
         r["tostreet"], r["facilitycl"], r["instdate"], r["boro"])
        for r in df.iter_rows(named=True)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO bike_routes
                (segmentid, bikeid, the_geom, street, fromstreet, tostreet, facilitycl, instdate, boro)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
    print(f"    bike_routes: {len(rows)} rows upserted")