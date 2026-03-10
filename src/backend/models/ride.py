from enum import Enum
from datetime import datetime
from pydantic import BaseModel


class RideableType(str, Enum):
    CLASSIC_BIKE = "classic_bike"
    ELECTRIC_BIKE = "electric_bike"


class MemberCasual(str, Enum):
    MEMBER = "member"
    CASUAL = "casual"


class Ride(BaseModel):
    id: str
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