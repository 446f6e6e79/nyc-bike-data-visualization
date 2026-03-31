import requests

from test_helpers import BASE_URL, DEFAULT_TIMEOUT

def test_get_stats_no_filters():
    """Test that /stats/ returns expected fields with no filters."""
    response = requests.get(f"{BASE_URL}/stats/", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rides"] == 2
    assert payload["hours_count"] == 2
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
    assert payload["hours_count"] == 0
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
    assert payload["hours_count"] == 2


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
    assert payload["hours_count"] == 2


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
    assert payload["hours_count"] == 0


def test_get_stats_day_of_week_invalid_value():
    """Test that /stats/ rejects out-of-range day_of_week values."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"day_of_week": "7"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 422


def test_get_stats_group_by_none_matches_default():
    """Test that group_by=none returns the same non-grouped stats shape."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"group_by": "none"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    assert payload["total_rides"] == 2
    assert payload["hours_count"] == 2


def test_get_stats_grouped_default_day_of_week():
    """Test that /stats/ supports group_by=day_of_week with 7 rows."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"group_by": "day_of_week"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()

    assert len(payload) == 7
    assert [row["day_of_week"] for row in payload] == [0, 1, 2, 3, 4, 5, 6]
    assert all(row["hour"] is None for row in payload)

    friday = next(row for row in payload if row["day_of_week"] == 4)
    assert friday["total_rides"] == 2
    assert friday["hours_count"] == 2


def test_get_stats_grouped_by_hour():
    """Test that /stats/ supports grouping by hour and returns 24 rows."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"group_by": "hour"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()

    assert len(payload) == 24
    assert [row["hour"] for row in payload] == list(range(24))
    assert all(row["day_of_week"] is None for row in payload)

    hour_5 = next(row for row in payload if row["hour"] == 5)
    hour_15 = next(row for row in payload if row["hour"] == 15)
    assert hour_5["total_rides"] == 1
    assert hour_15["total_rides"] == 1
    assert sum(row["total_rides"] for row in payload) == 2


def test_get_stats_grouped_by_day_and_hour():
    """Test that /stats/ supports grouping by day_of_week and hour together."""
    response = requests.get(
        f"{BASE_URL}/stats/",
        params={"group_by": "day_of_week,hour"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()

    assert len(payload) == 7 * 24
    assert sum(row["total_rides"] for row in payload) == 2

    friday_hour_5 = next(
        row for row in payload if row["day_of_week"] == 4 and row["hour"] == 5
    )
    friday_hour_15 = next(
        row for row in payload if row["day_of_week"] == 4 and row["hour"] == 15
    )
    saturday_hour_5 = next(
        row for row in payload if row["day_of_week"] == 5 and row["hour"] == 5
    )

    assert friday_hour_5["total_rides"] == 1
    assert friday_hour_15["total_rides"] == 1
    assert saturday_hour_5["total_rides"] == 0

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
        assert "station_a_id" in pair
        assert "station_a_name" in pair
        assert "station_a_lat" in pair
        assert "station_a_lon" in pair
        assert "station_b_id" in pair
        assert "station_b_name" in pair
        assert "station_b_lat" in pair
        assert "station_b_lon" in pair
        assert "groups" in pair
        assert isinstance(pair["groups"], list)
        assert len(pair["groups"]) == 1

        group = pair["groups"][0]
        assert group["day_of_week"] is None
        assert group["hour"] is None
        assert "a_to_b_count" in group
        assert "b_to_a_count" in group
        assert "total_rides" in group
        assert pair["station_a_lat"] is None or isinstance(pair["station_a_lat"], (int, float))
        assert pair["station_a_lon"] is None or isinstance(pair["station_a_lon"], (int, float))
        assert pair["station_b_lat"] is None or isinstance(pair["station_b_lat"], (int, float))
        assert pair["station_b_lon"] is None or isinstance(pair["station_b_lon"], (int, float))
        assert group["a_to_b_count"] >= 0
        assert group["b_to_a_count"] >= 0
        assert group["total_rides"] == group["a_to_b_count"] + group["b_to_a_count"]

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

def test_get_station_counts():
    """Test that /stats/station_ride_counts returns expected station counts."""
    response = requests.get(f"{BASE_URL}/stats/station_ride_counts", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 4
    for station in payload:
        assert "groups" in station
        assert len(station["groups"]) == 1
        group = station["groups"][0]
        if station["station_id"] == "6602.05":
            assert group["outgoing_rides"] == 1
            assert group["incoming_rides"] == 0
        assert "station_id" in station
        assert "station_name" in station
        assert "outgoing_rides" in group
        assert "incoming_rides" in group
        assert group["day_of_week"] is None
        assert group["hour"] is None
        assert group["outgoing_rides"] >= 0
        assert group["incoming_rides"] >= 0


def test_get_station_counts_grouped_by_day_of_week():
    """Test that grouped station counts are returned in nested station-first shape."""
    response = requests.get(
        f"{BASE_URL}/stats/station_ride_counts",
        params={"group_by": "day_of_week"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert payload

    for station in payload:
        assert "station_id" in station
        assert "station_name" in station
        assert "lat" in station
        assert "lon" in station
        assert "groups" in station
        assert isinstance(station["groups"], list)
        assert station["groups"]

        for group in station["groups"]:
            assert "day_of_week" in group
            assert "hour" in group
            assert "outgoing_rides" in group
            assert "incoming_rides" in group
            assert "total_rides" in group
            assert "hours_count" in group
            assert group["hour"] is None
            assert 0 <= group["day_of_week"] <= 6
            assert group["total_rides"] == group["outgoing_rides"] + group["incoming_rides"]


def test_get_trips_between_stations_grouped_by_hour():
    """Test that /stats/trips_between_stations supports group_by=hour."""
    response = requests.get(
        f"{BASE_URL}/stats/trips_between_stations",
        params={"group_by": "hour"},
        timeout=DEFAULT_TIMEOUT,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert payload

    for pair in payload:
        assert "station_a_id" in pair
        assert "station_a_name" in pair
        assert "station_b_id" in pair
        assert "station_b_name" in pair
        assert "groups" in pair
        assert isinstance(pair["groups"], list)
        assert pair["groups"]
        for group in pair["groups"]:
            assert "day_of_week" in group
            assert "hour" in group
            assert group["day_of_week"] is None
            assert 0 <= group["hour"] <= 23