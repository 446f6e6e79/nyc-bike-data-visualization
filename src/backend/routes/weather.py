from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from models.weather import Weather
from services import weather as weather_svc

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/", response_model=Weather)
def get_weather(dt: datetime):
    """
    Return hourly weather conditions for a geographic point and datetime.
    Requested a datetime it provides the weather conditions for the whole day.
    Data is sourced from the Open-Meteo Archive API for historical dates and
    cached in memory — repeated calls for the same location/month are free.
    """
    result = weather_svc.get_nyc_weather(dt)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Weather data unavailable for {dt.isoformat()}",
        )

    return result
