from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
# Middleware to handle CORS for development with Vite
from fastapi.middleware.cors import CORSMiddleware

from routes import stations, rides, stats
from services.rides import load_ride_data
from services.distances import load_distances_data

TEST_ENV_VAR = "TEST_MODE"

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
    load_ride_data(test=test, inMemory=True)
    load_distances_data(test=test, inMemory=True)

    yield


app = FastAPI(lifespan=lifespan)

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
app.include_router(stats.router)