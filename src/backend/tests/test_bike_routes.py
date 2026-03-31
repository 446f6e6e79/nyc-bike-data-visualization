import requests
from datetime import datetime

from test_helpers import BASE_URL, DEFAULT_TIMEOUT


# Simply check that the endpoint is up and returns a list of bike routes
def test_routes():
    response = requests.get(f"{BASE_URL}/bike_routes", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for bike_route in data:
        assert isinstance(bike_route, dict)
        geometry = bike_route.get("geometry")
        assert isinstance(geometry, dict)
        assert geometry.get("type") in ["LineString", "MultiLineString"]
        coords = geometry.get("coordinates")
        assert isinstance(coords, list)
        assert len(coords) > 0
        assert isinstance(coords[0], list)

        # basic fields
        assert isinstance(bike_route.get("routeID"), int)
        assert isinstance(bike_route.get("streetName"), str)
        assert isinstance(bike_route.get("fromStreet"), str)
        assert isinstance(bike_route.get("toStreet"), str)

        # facility class and installation date
        assert isinstance(bike_route.get("facilityClass"), str)
        inst_date = bike_route.get("instDate")
        assert isinstance(inst_date, str)
        # must be ISO date YYYY-MM-DD
        try:
            datetime.strptime(inst_date, "%Y-%m-%d")
        except Exception:
            raise AssertionError(f"instDate is not a valid YYYY-MM-DD date: {inst_date}")


