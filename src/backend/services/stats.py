import polars as pl
from datetime import date

from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import Stats, StationRideCount, TripsCountBetweenStations
from src.backend.services.rides import add_trip_duration, get_filtered_rides
from src.backend.loaders.rides_loader import RideFrame


def _collect_if_lazy(df: RideFrame) -> pl.DataFrame:
    """Helper to convert LazyFrame to DataFrame if needed."""
    return df.collect() if isinstance(df, pl.LazyFrame) else df
    
def get_overall_stats(
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    day_of_week: int | None = None,
    start_hour: int | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> Stats:
    rides = get_filtered_rides(
        user_type=user_type,
        bike_type=bike_type,
        start_date=start_date,
        end_date=end_date,
        day_of_week=day_of_week,
        start_hour=start_hour,
        start_station_id=start_station_id,
        end_station_id=end_station_id,
        join_distances=True,
    )
    # Add trip duration in seconds to the rides before calculating stats
    rides = add_trip_duration(rides)

    df = _collect_if_lazy(rides)

    if df.is_empty():
        return Stats(
            total_rides=0,
            average_duration_seconds=0.0,
            average_distance_km=0.0,
            total_duration_seconds=0.0,
            total_distance_km=0.0,
        )
    return Stats(
        total_rides=df.shape[0],
        average_duration_seconds=df["trip_duration_seconds"].mean(),
        average_distance_km=df["distance_km"].mean(),
        total_duration_seconds=df["trip_duration_seconds"].sum(),
        total_distance_km=df["distance_km"].sum(),
    )


def get_station_ride_counts_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    station_id: str | None = None,
    limit: int = 100,
) -> list[StationRideCount]:
    rides = get_filtered_rides(start_date=start_date, end_date=end_date)

    if station_id:
        rides = rides.filter(
            (pl.col("start_station_id") == station_id)
            | (pl.col("end_station_id") == station_id)
        )

    outgoing = (
        rides.group_by("start_station_id")
        .agg([
            pl.count().alias("outgoing"),
            pl.first("start_lat").alias("lat"),
            pl.first("start_lng").alias("lon"),
        ])
        .rename({"start_station_id": "station_id"})
    )

    incoming = (
        rides.group_by("end_station_id")
        .agg([
            pl.count().alias("incoming"),
            pl.first("end_lat").alias("lat"),
            pl.first("end_lng").alias("lon"),
        ])
        .rename({"end_station_id": "station_id"})
    )

    station_counts = outgoing.join(
        incoming,
        on="station_id",
        how="outer",
        suffix="_right",
    ).select([
        pl.coalesce("station_id", "station_id_right").alias("station_id"),
        pl.coalesce("lat", "lat_right").alias("lat"),
        pl.coalesce("lon", "lon_right").alias("lon"),
        pl.col("outgoing").fill_null(0),
        pl.col("incoming").fill_null(0),
    ])

    station_counts = (
        station_counts.with_columns(
            (pl.col("outgoing") + pl.col("incoming")).alias("total_rides")
        )
        .sort("total_rides", descending=True)
        .limit(limit)
    )

    station_counts = _collect_if_lazy(station_counts)
    if station_counts.is_empty():
        return []

    return [
        StationRideCount(
            station_id=row["station_id"],
            lat=row["lat"],
            lon=row["lon"],
            outgoing_rides=row["outgoing"],
            incoming_rides=row["incoming"],
        )
        for row in station_counts.iter_rows(named=True)
    ]


def get_trips_between_stations_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    station_id: str | None = None,
    limit: int = 100,
) -> list[TripsCountBetweenStations]:
    # Get rides filtered by date range and optionally by station_id
    rides = get_filtered_rides(start_date=start_date, end_date=end_date)

    # If station_id is provided, filter rides to only those that start or end at the station
    if station_id:  
        rides = rides.filter(
            (pl.col("start_station_id") == station_id)
            | (pl.col("end_station_id") == station_id)
        )

    # Calculate directional counts between station pairs
    directional_counts = (
        rides.group_by(["start_station_id", "end_station_id"])
        .agg(pl.count().alias("ride_count"))
    )

    # Create a pair_id that is the same for (A->B) and (B->A) to group them together
    directional_counts = directional_counts.with_columns([
        pl.when(pl.col("start_station_id") <= pl.col("end_station_id"))
        .then(
            pl.concat_str(
                [pl.col("start_station_id"), pl.col("end_station_id")],
                separator="<->",
            )
        )
        .otherwise(
            pl.concat_str(
                [pl.col("end_station_id"), pl.col("start_station_id")],
                separator="<->",
            )
        )
        .alias("pair_id"),
        (pl.col("start_station_id") <= pl.col("end_station_id")).alias("is_forward"),
    ])

    # Separate forward and reverse counts, naming them station_a and station_b consistently
    forward_counts = directional_counts.filter(pl.col("is_forward")).select([
        "pair_id",
        pl.col("start_station_id").alias("station_a"),
        pl.col("end_station_id").alias("station_b"),
        pl.col("ride_count").alias("a_to_b_count"),
    ])
    # For reverse counts, we swap the station_a and station_b to align with the forward counts
    reverse_counts = directional_counts.filter(~pl.col("is_forward")).select([
        "pair_id",
        pl.col("end_station_id").alias("station_a"),
        pl.col("start_station_id").alias("station_b"),
        pl.col("ride_count").alias("b_to_a_count"),
    ])
    # Join forward and reverse counts on the unique pair_id to get both directions in the same row   
    paired_counts = forward_counts.join(
        reverse_counts,
        on="pair_id",
        how="outer",
    ).select([
        pl.coalesce("station_a", "station_a_right").alias("station_a"),
        pl.coalesce("station_b", "station_b_right").alias("station_b"),
        # Fill nulls with 0 for counts where there is no data in one direction
        pl.col("a_to_b_count").fill_null(0),
        pl.col("b_to_a_count").fill_null(0),
    ])

    # Sort by total rides (a_to_b_count + b_to_a_count) and limit the results
    paired_counts = (
        paired_counts.with_columns(
            (pl.col("a_to_b_count") + pl.col("b_to_a_count")).alias("total_rides")
        )
        .sort("total_rides", descending=True)
        .limit(limit)
    )

    paired_counts = _collect_if_lazy(paired_counts)
    return [
        TripsCountBetweenStations(
            station_a=row["station_a"],
            station_b=row["station_b"],
            a_to_b_count=row["a_to_b_count"],
            b_to_a_count=row["b_to_a_count"],
            total_rides=row["total_rides"],
        )
        for row in paired_counts.iter_rows(named=True)
    ]