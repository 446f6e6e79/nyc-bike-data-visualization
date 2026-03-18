from contextlib import asynccontextmanager
import logging
import os
import time

from fastapi import FastAPI
from fastapi import Request
# Middleware to handle CORS for development with Vite
from fastapi.middleware.cors import CORSMiddleware

from src.backend.routes import stations, rides
from src.backend.loaders.distances_loader import load_distances_data
from src.backend.loaders.rides_loader import load_ride_data
from src.backend.loaders.weather_loader import load_weather_data   

from src.backend.config import IN_MEMORY_CACHE_ENABLED as IN_MEMORY, TEST_ENV_VAR, LOG_FILE_PATH, LOG_LEVEL

logger = logging.getLogger("backend.request")
if not logger.handlers:
    os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)

    stream_handler = logging.StreamHandler()
    file_handler = logging.FileHandler(LOG_FILE_PATH)
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s - %(message)s"
    )
    stream_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
logger.setLevel(LOG_LEVEL)
logger.propagate = False

def _is_historical_test_mode_enabled() -> bool:
    """
    Determine whether historical data should load in test mode from env var.

    Accepted truthy values: 1, true, yes, on (case-insensitive).
    """
    raw_value = os.getenv(TEST_ENV_VAR, "false")
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load historical data once on startup."""
    test = _is_historical_test_mode_enabled()
    load_ride_data(inMemory=IN_MEMORY, test=test)
    load_distances_data(inMemory=IN_MEMORY, test=test)
    load_weather_data(inMemory=IN_MEMORY, test=test)
    yield


app = FastAPI(lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.exception(
            "method=%s IN_memory=%s path=%s status=500 duration_ms=%.2f",
            request.method,
            IN_MEMORY,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "method=%s IN_memory=%s path=%s status=%s duration_ms=%.2f",
        request.method,
        IN_MEMORY,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

# Allow requests from the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the defined API routers
app.include_router(stations.router)
app.include_router(rides.router)