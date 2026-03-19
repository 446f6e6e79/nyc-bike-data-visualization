import requests
from test_helpers import BASE_URL, DEFAULT_TIMEOUT

def test_docs_endpoint_is_available():
    """Test that the /docs endpoint is available and returns a 200 status code."""
    response = requests.get(f"{BASE_URL}/docs", timeout=DEFAULT_TIMEOUT)

    assert response.status_code == 200