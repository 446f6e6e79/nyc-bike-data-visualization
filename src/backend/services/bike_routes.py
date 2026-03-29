import re
import polars as pl
from src.backend.loaders.bike_routes_loader import load_bike_routes_data, BikeRoutesFrame
from src.backend.models.bike_route import BikeRoute, BikeSegmentGeometry, Coordinate

def _collect_if_lazy(df: BikeRoutesFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

def _flatten_coords(coords_raw: list) -> list[tuple[float, float]]:
    """Helper function to flatten nested coordinate lists into a flat list of (lat, lng) tuples."""
    flat = []
    for item in coords_raw:
        if isinstance(item, (list, tuple)) and item and isinstance(item[0], (list, tuple)):
            # nested list of coordinates
            for sub in item:
                flat.append((float(sub[0]), float(sub[1])))
        else:
            flat.append((float(item[0]), float(item[1])))
    return flat

def _parse_wkt_coords(wkt: str) -> list[tuple[float, float]]:
        """Helper function to extract coordinate pairs from WKT strings."""
        num_re = r"(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)"
        pairs = re.findall(num_re + r"\s+" + num_re, wkt)
        return [(float(x), float(y)) for x, y in pairs]


def load_bike_routes() -> list[BikeRoute]:
    """Fetch all bike route segments and return as BikeRoute objects."""
    
    # Load the bike routes data, ensuring it's collected into memory for processing
    df = _collect_if_lazy(load_bike_routes_data())
    routes = []
    # Convert each row of the DataFrame into a BikeRoute object    
    for row in df.iter_rows(named=True):
        # Extract geometry information
        geometry = row["the_geom"]

        if isinstance(geometry, str):
            # Extract geometry type and coordinates from WKT string
            geom_type = (
                "MultiLineString"
                if geometry.strip().upper().startswith("MULTILINESTRING")
                else "LineString"
            )
            raw_coords = _parse_wkt_coords(geometry)
            coords = raw_coords

        routes.append(
            BikeRoute(
                geometry=BikeSegmentGeometry(
                    type=geom_type,
                    # Add the coordinates as a list of Coordinate objects
                    coordinates=[Coordinate(lat=coord[1], lng=coord[0]) for coord in coords],
                ),
                streetName=row["street"],
                fromStreet=row["fromstreet"],
                toStreet=row["tostreet"],
                facilityClass=row["facilitycl"],
                instDate=row["instdate"],
            )
        )

    return routes