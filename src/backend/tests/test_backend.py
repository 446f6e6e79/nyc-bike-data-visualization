import requests

#TODO: check their correctness and add more test cases as needed.

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


def _assert_weather_fields(weather: dict) -> None:
    for field in WEATHER_FIELDS:
        assert field in weather
        assert weather[field] is not None


def test_docs_endpoint_is_available():
    """Test that the /docs endpoint is available and returns a 200 status code."""
    response = requests.get(f"{BASE_URL}/docs", timeout=DEFAULT_TIMEOUT)

    assert response.status_code == 200

"""
STATION ENDPOINTS
"""
def test_get_station_info():
    """Test that the /stations/{station_id} endpoint returns the expected station information."""
    for station_id, station_name in STATION_INFO:
        response = requests.get(f"{BASE_URL}/stations/{station_id}", timeout=DEFAULT_TIMEOUT)
        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == station_id
        assert payload["name"] == station_name
        assert payload["bikes"] is None
        assert payload["docks"] is None


def test_get_station_availability():
    """Test that the /stations/{station_id}/availability endpoint returns live availability for a station."""
    station_id, station_name = STATION_INFO[0]
    response = requests.get(f"{BASE_URL}/stations/{station_id}/availability", timeout=DEFAULT_TIMEOUT)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == station_id
    assert payload["name"] == station_name
    assert isinstance(payload["bikes"], int)
    assert isinstance(payload["docks"], int)

def test_get_empty_stations():
    """Test that the /stations/empty endpoint returns the expected list of empty stations."""
    response = requests.get(f"{BASE_URL}/stations/empty", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    for station in payload:
        assert station["bikes"] == 0

"""
RIDE ENDPOINTS
"""
def test_get_rides_returns_mock_dataset_records():
    """Test that /rides returns base mock rides when enrich joins are disabled."""
    response = requests.get(
        f"{BASE_URL}/rides/",
        params={
            "user_type": "member",
            "join_weather": "false",
            "join_distances": "false",
        },
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert {ride["ride_id"] for ride in payload} == set(RIDE_IDS)
    for ride in payload:
        for field in REQUIRED_RIDE_FIELDS:
            assert field in ride
            assert ride[field] is not None
        assert ride["distance_km"] is None
        assert ride["weather"] is None


def test_get_rides_with_joins_returns_enriched_fields():
    """Test that /rides returns weather and distance values when joins are enabled."""
    response = requests.get(
        f"{BASE_URL}/rides/",
        params={
            "user_type": "member",
            "join_weather": "true",
            "join_distances": "true",
        },
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2

    for ride in payload:
        assert isinstance(ride.get("distance_km"), (float, int))
        assert ride.get("weather") is not None
        _assert_weather_fields(ride["weather"])


def test_get_ride_by_id_returns_expected_mock_record():
    """Test that /rides/by_ride_id returns a base record with joins disabled."""
    response = requests.get(
        f"{BASE_URL}/rides/by_ride_id/85744AF35D7F2DF5",
        params={"join_weather": "false", "join_distances": "false"},
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ride_id"] == "85744AF35D7F2DF5"
    assert payload["rideable_type"] == "electric_bike"
    assert payload["distance_km"] is None
    assert payload["weather"] is None


def test_get_ride_by_id_with_joins_returns_enriched_record():
    """Test that /rides/by_ride_id returns weather and distance when joins are enabled."""
    response = requests.get(
        f"{BASE_URL}/rides/by_ride_id/85744AF35D7F2DF5",
        params={"join_weather": "true", "join_distances": "true"},
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ride_id"] == "85744AF35D7F2DF5"
    assert payload["rideable_type"] == "electric_bike"
    assert isinstance(payload.get("distance_km"), (float, int))
    assert payload.get("weather") is not None
    if "weather" in payload and payload["weather"] is not None:
        _assert_weather_fields(payload["weather"])

"""STATS ENDPOINTS"""
def test_get_stats_no_filters():
    """Test that /stats/ returns expected fields with no filters."""
    response = requests.get(f"{BASE_URL}/stats/", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 2
    assert payload["average_duration_seconds"] > 0
    assert payload["average_distance_km"] > 0
    assert payload["total_duration_seconds"] > 0
    assert payload["total_distance_km"] > 0

def test_get_stats_user_type():
    """Test that /stats/ returns expected fields for a given user type."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"user_type": "casual"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 0
    assert payload["average_duration_seconds"] == 0
    assert payload["average_distance_km"] == 0
    assert payload["total_duration_seconds"] == 0
    assert payload["total_distance_km"] == 0
