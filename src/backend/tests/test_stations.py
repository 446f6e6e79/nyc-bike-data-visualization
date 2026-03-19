import requests

from test_helpers import BASE_URL, DEFAULT_TIMEOUT, STATION_INFO

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