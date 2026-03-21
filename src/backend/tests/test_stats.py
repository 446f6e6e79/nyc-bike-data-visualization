import requests

from test_helpers import BASE_URL, DEFAULT_TIMEOUT

def test_get_stats_no_filters():
    """Test that /stats/ returns expected fields with no filters."""
    response = requests.get(f"{BASE_URL}/stats/", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 2
    assert payload["number_of_days"] == 1
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
    assert payload["number_of_days"] == 0
    assert payload["average_duration_seconds"] == 0
    assert payload["average_distance_km"] == 0
    assert payload["total_duration_seconds"] == 0
    assert payload["total_distance_km"] == 0


def test_get_stats_day_of_week_comma_separated():
    """Test that /stats/ accepts comma-separated day_of_week query values."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"day_of_week": "4,5"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 2
    assert payload["number_of_days"] == 1


def test_get_stats_day_of_week_friday_only():
    """Test that day_of_week=4 (Friday) matches the test fixture rides."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"day_of_week": "4"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 2
    assert payload["number_of_days"] == 1


def test_get_stats_day_of_week_saturday_only():
    """Test that day_of_week=5 (Saturday) does not match Friday-only fixture rides."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"day_of_week": "5"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 0
    assert payload["number_of_days"] == 0


def test_get_stats_day_of_week_invalid_value():
    """Test that /stats/ rejects out-of-range day_of_week values."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"day_of_week": "7"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 422


def test_get_stats_by_day_of_week_returns_seven_days():
    """Test that /stats/by_day_of_week always returns all 7 weekdays."""
    response = requests.get(
        f"{BASE_URL}/stats/by_day_of_week",
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()

    assert isinstance(payload, list)
    assert len(payload) == 7
    assert [row["day_of_week"] for row in payload] == [0, 1, 2, 3, 4, 5, 6]

    # Check that the Friday stats are correct based on the test data
    friday = next(row for row in payload if row["day_of_week"] == 4)
    assert friday["total_rides"] == 2
    assert friday["number_of_days"] == 1
    assert friday["average_duration_seconds"] > 0
    assert friday["average_distance_km"] > 0
    assert friday["total_duration_seconds"] > 0
    assert friday["total_distance_km"] > 0

    saturday = next(row for row in payload if row["day_of_week"] == 5)
    assert saturday["total_rides"] == 0
    assert saturday["number_of_days"] == 0

    assert sum(row["total_rides"] for row in payload) == 2


def test_get_stats_by_day_of_week_with_filter():
    """Test that /stats/by_day_of_week applies day_of_week filter and keeps 7-day output."""
    response = requests.get(
        f"{BASE_URL}/stats/by_day_of_week",
        params={"day_of_week": "5,6"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()

    assert len(payload) == 7
    assert sum(row["total_rides"] for row in payload) == 0
    for row in payload:
        assert row["total_rides"] == 0
        assert row["number_of_days"] == 0
        assert row["average_duration_seconds"] == 0
        assert row["average_distance_km"] == 0
        assert row["total_duration_seconds"] == 0
        assert row["total_distance_km"] == 0

def test_get_station_counts():
    """Test that /stats/station_ride_counts returns expected station counts."""
    response = requests.get(f"{BASE_URL}/stats/station_ride_counts", timeout=DEFAULT_TIMEOUT)
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
    """Test that /stats/station_ride_counts returns 200 with empty counts for an invalid station_id."""
    response = requests.get(
        f"{BASE_URL}/stats/station_ride_counts",
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
    assert payload["number_of_days"] == 1
    assert payload["average_duration_seconds"] > 0
    assert payload["average_distance_km"] > 0
    assert payload["total_duration_seconds"] > 0
    assert payload["total_distance_km"] > 0

def test_get_trips_between_stations():
    """Test that /stats/trips_between_stations returns expected fields."""
    response = requests.get(
        f"{BASE_URL}/stats/trips_between_stations",
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    for pair in payload:
        assert "station_a" in pair
        assert "station_b" in pair
        assert "a_to_b_count" in pair
        assert "b_to_a_count" in pair
        assert "total_rides" in pair
        assert pair["a_to_b_count"] >= 0
        assert pair["b_to_a_count"] >= 0
        assert pair["total_rides"] == pair["a_to_b_count"] + pair["b_to_a_count"]

def test_get_trips_between_stations_with_invalid_station_id():
    """Test that /stats/trips_between_stations returns empty for unknown station_id."""
    response = requests.get(
        f"{BASE_URL}/stats/trips_between_stations",
        params={"station_id": "invalid_station_id"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload == []