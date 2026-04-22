from pydantic import BaseModel

class GroupedStationFlowCounts(BaseModel):
    """Count of trips between two stations, grouped by day of week, hour, or both."""
    day_of_week: int | None = None
    hour: int | None = None
    a_to_b_count: int
    b_to_a_count: int
    total_rides: int
    hours_count: int     # Number of hours that the stats are calculated over, used to calculate average hourly counts

class StationFlowCounts(BaseModel):
    """Station-level metadata with grouped flow count buckets between station pairs."""
    # The station metadata is constant across all groups, so we can just include it at the top level
    station_a_id: str
    station_a_name: str
    station_a_lat: float
    station_a_lon: float
    station_b_id: str
    station_b_name: str
    station_b_lat: float
    station_b_lon: float
    # Grouped counts of trips between the two stations, grouped by day of week, hour, both or none
    groups: list[GroupedStationFlowCounts]