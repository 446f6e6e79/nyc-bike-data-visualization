from contextlib import asynccontextmanager

from fastapi import FastAPI

from routes import stations, rides, stats
from services.historical import load_historical_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load historical data once on startup."""
    load_historical_data()
    yield
    # Code here would run on shutdown if needed


app = FastAPI(lifespan=lifespan)

# Include the defined API routers
app.include_router(stations.router)      # Real-time station related endpoints
app.include_router(rides.router)         # Historical ride data endpoints
app.include_router(stats.router)    # Historical statistics endpoints
