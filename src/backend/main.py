from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend import routes
from routes import stations
from services.historical import load_historical_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load historical data once on startup."""
    print("Loading historical data")
    load_historical_data()
    yield
    # Code here would run on shutdown if needed


app = FastAPI(lifespan=lifespan)

# Include the defined API routers
app.include_router(stations.router)             # Real-time station related endpoints
app.include_router(routes.rides.router)         # Historical ride data endpoints
app.include_router(routes.statistics.router)    # Historical statistics endpoints
