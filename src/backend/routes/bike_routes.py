from fastapi import APIRouter, Query

from src.backend.models.bike_route import BikeRoute
from src.backend.services.bike_routes import load_bike_routes, load_bike_routes_for_year

router = APIRouter(prefix="/bike_routes", tags=["bike_routes"])

@router.get("/", response_model=list[BikeRoute])
def get_bike_routes():
    """Retrieve all bike route segments."""
    return load_bike_routes()

@router.get("/history", response_model=list[BikeRoute])
def get_bike_routes_history(year: int = Query(..., ge=1900, description="Year to query active bike routes for")):
    """Retrieve bike route segments that were active at any point during the given year."""
    return load_bike_routes_for_year(year)

