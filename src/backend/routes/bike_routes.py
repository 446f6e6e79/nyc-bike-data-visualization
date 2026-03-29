from fastapi import APIRouter

from src.backend.models.bike_route import BikeRoute
from src.backend.services.bike_routes import load_bike_routes
router = APIRouter(prefix="/bike_routes", tags=["bike_routes"])

@router.get("/", response_model=list[BikeRoute])
def get_bike_routes():
    """Endpoint to retrieve all bike route segments."""
    return load_bike_routes()
    
