from contextlib import asynccontextmanager

from fastapi import FastAPI
# Middleware to handle CORS for development with Vite
from fastapi.middleware.cors import CORSMiddleware

from routes import stations, rides, stats, weather
from services.historical import load_historical_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load historical data once on startup."""
    load_historical_data()
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
app.include_router(weather.router)