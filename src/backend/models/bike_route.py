from enum import Enum
from pydantic import BaseModel


class Coordinate(BaseModel):
    """Model representing a geographic coordinate with latitude and longitude."""
    lat: float
    lng: float


class GeometryType(str, Enum):
    """Enum for the type of geometry in the bike route data.
    Possible values include:
    - LineString: A single line representing a bike route segment
    - MultiLineString: Multiple lines representing a bike route segment that may have multiple paths
      (e.g. a loop or a route with branches)
    """
    LINESTRING = "LineString"
    MULTILINESTRING = "MultiLineString"


class BikeSegmentGeometry(BaseModel):
    type: GeometryType
    coordinates: list[Coordinate]


# TODO: enrich with other information
class BikeRoute(BaseModel):
    """A single NYC bike route segment."""
    geometry: BikeSegmentGeometry
    streetName: str
    fromStreet: str
    toStreet: str
    facilityClass: str          # The type of bike facility. A value from ['I', 'II', 'III', 'L']
    instDate: str               # The date the bike route segment was installed, in YYYY-MM-DD format