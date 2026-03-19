import requests

from test_helpers import (
    BASE_URL,
    DEFAULT_TIMEOUT,
    REQUIRED_RIDE_FIELDS,
    RIDE_IDS,
    assert_weather_fields,
)

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
        assert_weather_fields(ride["weather"])

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
        assert_weather_fields(payload["weather"])