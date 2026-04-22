import re
from src.backend.db import get_conn
from src.backend.models.bike_route import BikeRoute, BikeSegmentGeometry, GeometryType

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

def load_bike_routes() -> list[BikeRoute]:
    """Fetch all bike route segments from PostgreSQL and return as BikeRoute objects."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT bikeid, the_geom, street, fromstreet, tostreet, facilitycl, instdate "
                "FROM bike_routes"
            )
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]

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
            instDate=row["instdate"],
        )
        for row in rows
    ]