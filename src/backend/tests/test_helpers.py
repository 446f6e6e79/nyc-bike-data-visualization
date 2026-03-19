RIDE_IDS = ["85744AF35D7F2DF5", "9D18958E5788880B"]
STATION_INFO = [("6602.05", "W 42 St & 8 Ave"), ("6839.04", "E 58 St & Madison Ave")]
REQUIRED_RIDE_FIELDS = [
    "ride_id",
    "rideable_type",
    "started_at",
    "ended_at",
    "start_station_name",
    "start_station_id",
    "end_station_name",
    "end_station_id",
    "start_lat",
    "start_lng",
    "end_lat",
    "end_lng",
    "member_casual",
]
WEATHER_FIELDS = ["time", "temperature", "wind_speed", "precipitation", "weather_code"]

BASE_URL = "http://127.0.0.1:8000"
DEFAULT_TIMEOUT = 10

def assert_weather_fields(weather: dict) -> None:
    for field in WEATHER_FIELDS:
        assert field in weather
        assert weather[field] is not None