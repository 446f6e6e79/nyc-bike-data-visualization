import polars as pl
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import Stats, StationRideCount, TipsCountBetweenStations
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

@router.get("/station_counts", response_model=list[StationRideCount])
def get_station_ride_counts(
    start_date: date | None = Query(default=None), 
    end_date: date | None = Query(default=None),
    station_id: str | None = Query(default=None)
):
    """Get the count of rides starting or ending at each station."""
    outgoing_rides = get_filtered_rides(start_date=start_date, end_date=end_date, start_station_id=station_id)
    incoming_rides = get_filtered_rides(start_date=start_date, end_date=end_date, end_station_id=station_id)
    # Compute outgoing table -> one row per ride with start station info and outgoing=1, incoming=0
    outgoing = outgoing_rides.select([
        pl.col("start_station_id").alias("station_id"),
        pl.col("start_lat").alias("lat"),
        pl.col("start_lng").alias("lon"),
        pl.lit(1).alias("outgoing"),
        pl.lit(0).alias("incoming"),
    ])

    # Compute incoming table -> one row per ride with end station info and outgoing=0, incoming=1
    incoming = incoming_rides.select([
        pl.col("end_station_id").alias("station_id"),
        pl.col("end_lat").alias("lat"),
        pl.col("end_lng").alias("lon"),
        pl.lit(0).alias("outgoing"),
        pl.lit(1).alias("incoming"),
    ])

    # Compute the station counts by concatenating outgoing and incoming
    # then grouping by station_id and summing outgoing and incoming
    station_counts = (
        pl.concat([outgoing, incoming])
        .group_by("station_id")
        .agg([
            pl.sum("outgoing"),
            pl.sum("incoming"),
            pl.first("lat"),
            pl.first("lon"),
        ])
    )
    station_counts = _collect_if_lazy(station_counts)
    # Check if the result is empty before trying to iterate over it
    if station_counts.is_empty():
        return []
    # Build the list of StationRideCount objects from the aggregated DataFrame
    return [
        StationRideCount(
            station_id=row["station_id"],
            lat=row["lat"],
            lon=row["lon"],
            outgoing_rides=row["outgoing"],
            incoming_rides=row["incoming"]
        )
        for row in station_counts.iter_rows(named=True)
    ]
"""
#TODO: check the correctness of this endpoint.
Check how to group same station pairs together (e.g. A->B and B->A), but keeping the directionality of counts
"""
@router.get("/tips_count_between_stations", response_model=list[TipsCountBetweenStations])
def get_tips_count_between_stations(
    start_date: date | None = Query(default=None), 
    end_date: date | None = Query(default=None),
    start_station_id: str | None = Query(default=None),
    end_station_id: str | None = Query(default=None),
    limit: int | None = Query(default=100, ge=1, le=1000)   # Limit the number of results returned to avoid overwhelming the client
):

    """Get the count of rides between two stations."""
    rides = get_filtered_rides(start_date=start_date, end_date=end_date, start_station_id=start_station_id, end_station_id=end_station_id)

    # Group by start and end station and count the number of rides
    tips_count = (
        rides.group_by(["start_station_id", "end_station_id"])
        .agg(pl.count().alias("ride_count"))
    )
    # return the best {limit} station pairs by ride count, sorted in descending order
    tips_count = tips_count.sort("ride_count", descending=True).limit(limit)
    tips_count = _collect_if_lazy(tips_count)
    return [
        TipsCountBetweenStations(
            start_station_id=row["start_station_id"],
            end_station_id=row["end_station_id"],
            ride_count=row["ride_count"]
        )
        for row in tips_count.iter_rows(named=True)
    ]