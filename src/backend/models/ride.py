from enum import Enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

class RideableType(str, Enum):
    """
    Enum for the type of rideable used in the CitiBike system. Possible values include:
    - classic_bike: A traditional pedal bike
    - electric_bike: A bike with an electric motor assist;
    """
    CLASSIC_BIKE = "classic_bike"
    ELECTRIC_BIKE = "electric_bike"

class MemberCasual(str, Enum):
    """
    Enum for the type of user in the CitiBike system. Possible values include:
    - member: A registered member of the CitiBike system
    - casual: A non-member user, typically a one-time or infrequent rider
    """
    MEMBER = "member"
    CASUAL = "casual"
    
class Weather(BaseModel):
    """Model representing hourly weather conditions for NYC."""
    time: datetime  # Hourly timestamp (Eastern Time)
    temperature: float  # Temperature at 2 m (C)
    wind_speed: float  # Wind speed at 10 m (km/h)
    precipitation: float  # Total precipitation in the hour (mm)
    weather_code: int  # WMO weather interpretation code

class Ride(BaseModel):
    ride_id: str                              # The unique ride ID from the original data
    rideable_type: RideableType               # The type of bike used for the ride (classic_bike or electric_bike)
    started_at: datetime                      # The start time of the ride, parsed as a datetime object  
    ended_at: datetime                        # The end time of the ride, parsed as a datetime object
    start_station_name: str                   # The name of the station where the ride started
    start_station_id: str                     # The ID of the station where the ride started
    end_station_name: str                     # The name of the station where the ride ended
    end_station_id: str                       # The ID of the station where the ride ended
    start_lat: float                          # The latitude of the start station
    start_lng: float                          # The longitude of the start station
    end_lat: float                            # The latitude of the end station
    end_lng: float                            # The longitude of the end station
    member_casual: MemberCasual               # The type of user (member or casual)
    trip_duration_seconds: Optional[float] = None  # Duration of the trip in seconds, can be None if not yet computed
    distance_km: Optional[float] = None       # Precomputed distance between start and end stations, can be None if not yet computed
    average_ride_speed_kmh: Optional[float] = None # Precomputed average speed of the ride in km/h, can be None if not yet computed
    weather: Optional[Weather] = None         # Considered weather at start time