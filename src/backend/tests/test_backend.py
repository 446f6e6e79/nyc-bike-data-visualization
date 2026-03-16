from pathlib import Path
import sys
import requests

#TODO: check their correctness and add more test cases as needed.

RIDE_IDS = ["85744AF35D7F2DF5", "9D18958E5788880B"]
STATION_INFO = [("6602.05", "W 42 St & 8 Ave"), ("6839.04", "E 58 St & Madison Ave")]

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = "http://127.0.0.1:8000"
DEFAULT_TIMEOUT = 10


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
    """Test that the /rides endpoint returns the expected mock dataset records."""
    response = requests.get(f"{BASE_URL}/rides/", timeout=DEFAULT_TIMEOUT)

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert {ride["ride_id"] for ride in payload} == {
        "85744AF35D7F2DF5",
        "9D18958E5788880B",
    }
    for ride in payload:
        if "weather" in ride and ride["weather"] is not None:
            for field in [
                "time",
                "temperature",
                "wind_speed",
                "precipitation",
                "weather_code",
            ]:
                assert field in ride["weather"]


def test_get_ride_by_id_returns_expected_mock_record():
    """Test that the /rides/by_ride_id endpoint returns the expected mock dataset record."""
    response = requests.get(
        f"{BASE_URL}/rides/by_ride_id/85744AF35D7F2DF5",
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ride_id"] == "85744AF35D7F2DF5"
    assert payload["rideable_type"] == "electric_bike"
    if "weather" in payload and payload["weather"] is not None:
        for field in [
            "time",
            "temperature",
            "wind_speed",
            "precipitation",
            "weather_code",
        ]:
            assert field in payload["weather"]


def test_ride_type_statistics_uses_mock_dataset():
    """Test that the /statistics/ride-types/{rideable_type} endpoint returns statistics based on the mock dataset."""
    response = requests.get(
        f"{BASE_URL}/statistics/ride-types/classic_bike",
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["rideable_type"] == "classic_bike"
    assert payload["stats"]["total_rides"] == 1


def test_user_type_statistics_uses_mock_dataset():
    """Test that the /statistics/user-types/{user_type} endpoint returns statistics based on the mock dataset."""
    response = requests.get(
        f"{BASE_URL}/statistics/user-types/member",
        timeout=DEFAULT_TIMEOUT,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user_type"] == "member"
    assert payload["stats"]["total_rides"] == 2




