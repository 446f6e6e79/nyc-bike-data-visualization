from enum import Enum
from datetime import date
from pydantic import BaseModel

class GeometryType(str, Enum):
    LINESTRING = "LineString"
    MULTILINESTRING = "MultiLineString"

# Define a Coordinate model for latitude and longitude pairs
class BikeSegmentGeometry(BaseModel):
    type: GeometryType
    coordinates: list[list[float]] | list[list[list[float]]]

# Define the FacilityClass enum for the different types of bike facilities
class FacilityClass(str, Enum):
    I   = "I"     # Off-street path / greenway
    II  = "II"    # Dedicated painted lane
    III = "III"   # Signed shared route
    L   = "L"     # Shared lane marking (sharrow)

class BikeRoute(BaseModel):
    """A single NYC bike route segment."""
    geometry: BikeSegmentGeometry
    bikeid: int
    streetName: str
    fromStreet: str
    toStreet: str
    facilityClass: FacilityClass
    instDate: date | None = None