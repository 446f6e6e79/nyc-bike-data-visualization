from pydantic import BaseModel


class StationInfo(BaseModel):
    """Model representing a bike station."""
    id: str                   # Id of the station, using short_name from GBFS for consistency with historical data
    name: str                 # Name of the station
    lat: float                # Latitude of the station
    lon: float                # Longitude of the station
    capacity: int             # Total capacity of the station (number of docks)

class StationStatus(BaseModel):
    """Model representing the current status of a bike station."""
    num_bikes_available: int         # total number of bikes currently available at the station
    num_classic_bikes_available: int # Number of classic bikes currently available at the station
    num_ebikes_available: int        # Number of e-bikes currently available at the station
    num_docks_available: int         # Number of docks currently available at the station
    num_bikes_disabled: int          # Number of bikes currently disabled at the station

class Station(StationInfo, StationStatus):
    """Model representing a bike station with both static information and current status."""
    pass
