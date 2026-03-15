import calendar
from datetime import datetime
from typing import Optional

import requests

from models.weather import Weather

# ---------------------------------------------------------------------------
# WMO Weather interpretation codes → human-readable label
# https://open-meteo.com/en/docs#weathervariables
# ---------------------------------------------------------------------------
_WMO: dict[int, str] = {
    0:  "Clear sky",
    1:  "Mainly clear",
    2:  "Partly cloudy",
    3:  "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}

# Central Park coordinates 
NYC_COORDS = (40.7823234, -73.9654161)

# In-memory cache for fetched weather data, keyed by (year, month) tuples.
_cache: dict[tuple[int, int], dict[str, Weather]] = {}

# Fetch a full month of hourly weather from the Open-Meteo Archive API.
def _fetch_month(year: int, month: int) -> dict[str, Weather]:
    """Fetch a full month of hourly weather from the Open-Meteo Archive API."""
    last_day = calendar.monthrange(year, month)[1]

    resp = requests.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": NYC_COORDS[0],
            "longitude": NYC_COORDS[1],
            "start_date": f"{year}-{month:02d}-01",
            "end_date":   f"{year}-{month:02d}-{last_day:02d}",
            "hourly": (
                "temperature_2m,"
                "apparent_temperature,"
                "relative_humidity_2m,"
                "precipitation,"
                "weather_code,"
                "wind_speed_10m"
            ),
            "timezone": "America/New_York",
            "wind_speed_unit": "kmh",
        },
        timeout=(5, 30),
    )
    resp.raise_for_status()
    h = resp.json()["hourly"]

    result: dict[str, Weather] = {}
    for i, ts in enumerate(h["time"]):
        # The API returns a weather code that we can interpret using the WMO mapping.
        code = int(h["weather_code"][i])
        result[ts] = Weather(
            time=datetime.fromisoformat(ts),
            temperature=h["temperature_2m"][i],
            feels_like=h["apparent_temperature"][i],
            humidity=int(h["relative_humidity_2m"][i]),
            wind_speed=h["wind_speed_10m"][i],
            precipitation=h["precipitation"][i],
            weather_code=code,
            description=_WMO.get(code, "Unknown"),
        )
    return result


def get_nyc_weather(dt: datetime) -> Optional[Weather]:
    """
    Return weather for New York City at *dt* (hourly resolution, Eastern Time).

    Fetches and caches an entire month on the first call for a given
    """

    key = (dt.year, dt.month)
    if key not in _cache:
        _cache[key] = _fetch_month(dt.year, dt.month)

    hour_str = dt.strftime("%Y-%m-%dT%H:00")
    return _cache[key].get(hour_str)

def get_weather_for_ride(started_at: datetime) -> Optional[Weather]:
    """
    Return weather at the start of a ride using station id + start datetime.

    This function intentionally does not depend on the Ride model.
    """
    return get_nyc_weather(started_at)
