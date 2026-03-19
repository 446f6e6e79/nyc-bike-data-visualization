import requests

from test_helpers import BASE_URL, DEFAULT_TIMEOUT

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

def test_get_station_counts():
    """Test that /stats/station_counts returns expected station counts."""
    response = requests.get(f"{BASE_URL}/stats/station_counts", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 4
    for station in payload:
        if station["station_id"] == "6602.05":
            assert station["outgoing_rides"] == 1
            assert station["incoming_rides"] == 0
        assert "station_id" in station
        assert "outgoing_rides" in station
        assert "incoming_rides" in station
        assert station["outgoing_rides"] >= 0
        assert station["incoming_rides"] >= 0

def test_get_station_counts_with_invalid_station_id():
    """Test that /stats/station_counts returns 200 with empty counts for an invalid station_id."""
    response = requests.get(
        f"{BASE_URL}/stats/station_counts",
        params={"station_id": "invalid_station_id"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 0

def test_get_station_stats_with_valid_station_id():
    """Test that /stats/ returns expected fields for a given date range."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"station_id": "6602.05"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 2
    assert payload["average_duration_seconds"] > 0
    assert payload["average_distance_km"] > 0
    assert payload["total_duration_seconds"] > 0
    assert payload["total_distance_km"] > 0