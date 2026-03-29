import re
import polars as pl
from datetime import datetime
from src.backend.loaders.bike_routes_loader import load_bike_routes_data, BikeRoutesFrame
from src.backend.models.bike_route import BikeRoute, BikeSegmentGeometry, GeometryType

def _collect_if_lazy(df: BikeRoutesFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

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
    """Fetch all bike route segments and return as BikeRoute objects."""
    df = _collect_if_lazy(load_bike_routes_data())
    routes = []

    for row in df.iter_rows(named=True):
        wkt: str = row["the_geom"]
        is_multi = wkt.strip().upper().startswith("MULTILINESTRING")
        geom_type = GeometryType.MULTILINESTRING if is_multi else GeometryType.LINESTRING
        coordinates = _parse_wkt_multilinestring(wkt) if is_multi else _parse_wkt_linestring(wkt)

        routes.append(
            BikeRoute(
                geometry=BikeSegmentGeometry(type=geom_type, coordinates=coordinates),
                streetName=row["street"],
                fromStreet=row["fromstreet"],
                toStreet=row["tostreet"],
                facilityClass=row["facilitycl"],
                instDate=datetime.strptime(row["instdate"], "%m/%d/%Y").date()
            )
        )

    return routes