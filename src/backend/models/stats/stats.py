from pydantic import BaseModel
from enum import Enum
from datetime import date as date_type

class StatsGroupBy(str, Enum):
    """Enumeration of possible time dimensions to group stats by."""
    NONE = "none"
    DAY_OF_WEEK = "day_of_week"
    HOUR = "hour"
    DAY_OF_WEEK_AND_HOUR = "day_of_week,hour"
    DATE = "date"

class Stats(BaseModel):
    """Base class for statistics models."""
    total_rides: int
    hours_count: int        # Number of hours that the stats are calculated over, used to calculate average hourly counts
    average_duration_seconds: float
    average_distance_km: float
    average_speed_kmh: float
    total_duration_seconds: float
    total_distance_km: float

# Extends Stats with optional day_of_week and hour fields for grouping by day of week, hour, or both
class GroupedStats(Stats):
    """Statistics model grouped by day of week, hour, or both."""
    day_of_week: int | None = None      # Day of week data refers to (0=Monday, 6=Sunday), or None if not grouped by day of week
    hour: int | None = None             # Hour of day data refers to (0-23), or None if not grouped by hour
    weather_code: int | None = None     # Weather condition for the group, or None if not grouped by weather
    date: date_type | None = None       # Calendar date, populated only when grouped by date
