import re
from datetime import date
from src.backend.db import get_conn
from src.backend.models.bike_route import BikeRoute, BikeSegmentGeometry, GeometryType

_SELECT = (
    "SELECT bikeid, the_geom, street, fromstreet, tostreet, facilitycl, installation_date, retired_date, boro "
    "FROM bike_routes"
)

def _parse_wkt_multilinestring(wkt: str) -> list[list[list[float]]]:
    """Parse a MultiLineString WKT into a list of line segments, each a list of [lng, lat] pairs."""
    segment_re = r"\(([^()]+)\)"
    coord_re = r"(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)"
    return [
        [[float(lng), float(lat)] for lng, lat in re.findall(coord_re, segment)]
        for segment in re.findall(segment_re, wkt)
    ]

def _parse_wkt_linestring(wkt: str) -> list[list[float]]:
    """Parse a LineString WKT into a list of [lng, lat] pairs."""
    coord_re = r"(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)"
    return [[float(lng), float(lat)] for lng, lat in re.findall(coord_re, wkt)]

def _rows_to_bike_routes(rows: list[dict]) -> list[BikeRoute]:
    return [
        BikeRoute(
            geometry=BikeSegmentGeometry(
                type=GeometryType.MULTILINESTRING if row["the_geom"].strip().upper().startswith("MULTILINESTRING") else GeometryType.LINESTRING,
                coordinates=_parse_wkt_multilinestring(row["the_geom"]) if row["the_geom"].strip().upper().startswith("MULTILINESTRING") else _parse_wkt_linestring(row["the_geom"]),
            ),
            routeID=row["bikeid"],
            streetName=row["street"],
            fromStreet=row["fromstreet"],
            toStreet=row["tostreet"],
            facilityClass=row["facilitycl"],
            instDate=row["installation_date"],
            retiredDate=row["retired_date"],
            boro=row["boro"],
        )
        for row in rows
    ]

def load_bike_routes(current_only: bool = False) -> list[BikeRoute]:
    """Fetch bike route segments from PostgreSQL. Pass current_only=True to limit to active routes."""
    query = _SELECT + (" WHERE status = 'Current'" if current_only else "")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return _rows_to_bike_routes(rows)

def load_bike_routes_for_year(year: int) -> list[BikeRoute]:
    """Return routes that were active at any point during the given year."""
    year_start = date(year, 1, 1)
    year_end   = date(year, 12, 31)
    query = (
        _SELECT
        + " WHERE installation_date <= %s"
        "   AND (retired_date IS NULL OR retired_date >= %s)"
    )
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (year_end, year_start))
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return _rows_to_bike_routes(rows)