from fastapi import APIRouter, HTTPException

from models.ride import Ride
from services.historical import load_historical_data

router = APIRouter(prefix="/rides", tags=["rides"])

