import polars as pl
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import Stats
from src.backend.services.rides import get_filtered_rides
from src.backend.loaders.rides_loader import RideFrame


router = APIRouter(prefix="/stats", tags=["stats"])

def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df

@router.get("/", response_model=Stats)
def get_stats(    
    user_type: MemberCasual | None = Query(default=None),
    bike_type: RideableType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    day_of_week: int | None = Query(default=None, ge=0, le=6),  # 0=Monday, 6=Sunday
    start_hour: int | None = Query(default=None, ge=0, le=23),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None)
):
    """Get all historical rides."""
    rides = get_filtered_rides(user_type=user_type, 
                            bike_type=bike_type,
                            start_date=start_date, 
                            end_date=end_date,
                            day_of_week=day_of_week,
                            start_hour=start_hour,
                            start_station_id=start_station_id, 
                            end_station_id=end_station_id,
                            join_distances=True)
    df = _collect_if_lazy(rides)
    if df.is_empty():
        return Stats(total_rides=0, average_duration_seconds=0.0, average_distance_km=0.0, total_duration_seconds=0.0, total_distance_km=0.0)
    return Stats(
        total_rides=df.shape[0],
        average_duration_seconds=((df["ended_at"].cast(pl.Datetime).cast(pl.Int64) - df["started_at"].cast(pl.Datetime).cast(pl.Int64))).mean() / 1000000, # Convert to seconds
        average_distance_km=df["distance_km"].mean(),
        total_duration_seconds=(df["ended_at"].cast(pl.Datetime).cast(pl.Int64) - df["started_at"].cast(pl.Datetime).cast(pl.Int64)).sum() / 1000000,  # Convert to seconds
        total_distance_km=df["distance_km"].sum()
    )