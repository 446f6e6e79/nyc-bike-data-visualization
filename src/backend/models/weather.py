from datetime import datetime

from pydantic import BaseModel


class Weather(BaseModel):
    """Model representing hourly weather conditions for NYC."""
    time: datetime  # Hourly timestamp (Eastern Time)
    temperature: float  # Temperature at 2 m (C)
    feels_like: float  # Apparant temperature at 2 m (C)
    humidity: int  # Relative humidity at 2 m (%)
    wind_speed: float  # Wind speed at 10 m (km/h)
    precipitation: float  # Total precipitation in the hour (mm)
    weather_code: int  # WMO weather interpretation code
    description: str  # Human-readable weather description
