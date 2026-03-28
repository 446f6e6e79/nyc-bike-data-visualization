from typing import Optional
from pydantic import BaseModel

class BikeRouteGeometry(BaseModel):
    type: str                    # "LineString" or "MultiLineString"
    coordinates: list            # list of [lon, lat] pairs, representing a list that identifies the path of the bike route

class BikeRoute(BaseModel):
    """A single NYC bike route segment."""
    geometry: BikeRouteGeometry
    street: Optional[str] = None         # street name
    facilitycl: Optional[str] = None     # facility class (e.g. "I", "II", "III", "IV")
    facilitytyp: Optional[str] = None    # e.g. "Greenway", "Protected Path"
    tf_facilit: Optional[str] = None     # travel direction facility (T→F)
    ft_facilit: Optional[str] = None     # travel direction facility (F→T)
    bikedir: Optional[str] = None        # direction: "TF", "FT", "TW"
    borough: Optional[str] = None