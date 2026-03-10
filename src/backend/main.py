"""
Launch the backend server:
    uvicorn main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from routes import stations
from services.historical import load_historical_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load historical data once on startup."""
    load_historical_data()
    yield
    # Code here would run on shutdown if needed


app = FastAPI(lifespan=lifespan)

app.include_router(stations.router)
