from enum import Enum
from datetime import datetime
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


class Ride(BaseModel):
    ride_id: str
    rideable_type: RideableType
    started_at: datetime
    ended_at: datetime
    start_station_name: str
    start_station_id: str
    end_station_name: str
    end_station_id: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    member_casual: MemberCasual