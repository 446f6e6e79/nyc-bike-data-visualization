from pydantic import BaseModel


class Station(BaseModel):
    """Model representing a bike station."""
    id: str                   # Id of the station, using short_name from GBFS for consistency with historical data
    name: str                 # Name of the station
    lat: float                # Latitude of the station
    lon: float                # Longitude of the station
    bikes: int | None = None  # Number of bikes currently available (optional)
    docks: int | None = None  # Number of docks currently available (optional)
