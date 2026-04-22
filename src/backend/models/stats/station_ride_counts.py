from pydantic import BaseModel
from enum import Enum

class StationRideGroupBy(str, Enum):
    NONE = "none"
    DAY_OF_WEEK = "day_of_week"
    HOUR = "hour"
    DAY_OF_WEEK_AND_HOUR = "day_of_week,hour"
    # NO DATE GROUPING — not applicable for station-level ride counts, which are already aggregated at the station-month level

class GroupedStationRideCount(BaseModel):
    """Grouped bucket of rides starting or ending at a station."""
    day_of_week: int | None = None
    hour: int | None = None
    outgoing_rides: int
    incoming_rides: int
    total_rides: int
    hours_count: int        # Number of hours that the stats are calculated over, used to calculate average hourly counts

class StationRideCounts(BaseModel):
    """Station-level metadata with grouped ride buckets."""
    # The station metadata is constant across all groups, so we can just include it at the top level
    station_id: str
    station_name: str
    lat: float
    lon: float
    # Grouped counts of rides starting or ending at this station, grouped by day of week, hour, both or none
    groups: list[GroupedStationRideCount]