import logging
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent

# GBFS feed URLs (Lyft/Citi Bike)
INFO_URL   = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_information.json"
STATUS_URL = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json"

# GBFS cache and type constants
TTL_SECONDS              = 60
GBFS_CLASSIC_BIKE_TYPE_ID = "1"
GBFS_EBIKE_TYPE_ID        = "2"

# Logging
LOG_FILE_PATH = "logs/requests.log"
LOG_LEVEL     = logging.INFO

# Test fixtures
TEST_DATA_DIR = BACKEND_ROOT / "tests" / "test_data"
