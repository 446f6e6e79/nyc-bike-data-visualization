def upsert_station_metadata(conn, station_info: list[dict]) -> None:
    """
    Upsert station metadata from GBFS feed into station_metadata table.
    Arguments:
        - conn: psycopg2 connection object to the database
        - station_info: List of dictionaries containing station metadata with keys:
            - short_name (str): Unique station ID
            - name (str): Station name
            - lat (float): Latitude
            - lon (float): Longitude
    """
    rows = [
        (s["short_name"], s["name"], s["lat"], s["lon"])
        for s in station_info
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO station_metadata (station_id, station_name, lat, lon)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (station_id) DO NOTHING
            """,
            rows,
        )
    print(f"    station_metadata: {len(rows)} stations upserted")
