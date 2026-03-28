from fastapi import APIRouter

from src.backend.models.bike_route import BikeRoute
from src.backend.services.bike_routes import fetch_bike_routes, _build_bike_route

router = APIRouter(prefix="/bike_routes", tags=["bike_routes"])


@router.get("/", response_model=list[BikeRoute])
def get_bike_routes():
    """Get all NYC bike route segments (cached 1 hour)."""
    features = fetch_bike_routes()
    return [_build_bike_route(f) for f in features]

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from src.backend.services.bike_routes import fetch_bike_routes

router = APIRouter(prefix="/bike_routes", tags=["bike_routes"])

#TODO: Swagger isn't able to load it
@router.get("/", response_class=JSONResponse)
def get_bike_routes():
    """Return all preprocessed bike route segments (served from in-memory cache)."""
    return fetch_bike_routes()

@router.get("/count")
def get_bike_routes_count() -> dict:
    """Return the number of cached bike route segments. Useful for health checks."""
    return {"count": len(fetch_bike_routes())}


@router.get("/sample")
def get_bike_routes_sample(n: int = Query(default=5, ge=1, le=50)) -> list:
    """Return a small sample of bike route segments. Use this in Swagger for inspection."""
    return fetch_bike_routes()[:n]