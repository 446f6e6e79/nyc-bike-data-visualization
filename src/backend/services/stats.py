import polars as pl
from datetime import date

from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import DayOfWeekStats, Stats, StationRideCount, TripsCountBetweenStations
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
    day_of_week: int | list[int] | None = None,
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
            number_of_days=0,
            average_duration_seconds=0.0,
            average_distance_km=0.0,
            total_duration_seconds=0.0,
            total_distance_km=0.0,
        )
    return Stats(
        total_rides=df.shape[0],
        number_of_days=df["started_at"].dt.date().n_unique(),
        average_duration_seconds=df["trip_duration_seconds"].mean(),
        average_distance_km=df["distance_km"].mean(),
        total_duration_seconds=df["trip_duration_seconds"].sum(),
        total_distance_km=df["distance_km"].sum(),
    )


def get_day_of_week_stats(
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    day_of_week: int | list[int] | None = None,
    start_hour: int | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> list[DayOfWeekStats]:
    """Get historical ride stats grouped by day of week (0=Monday, 6=Sunday)."""
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
    rides = add_trip_duration(rides)
    df = _collect_if_lazy(rides)

    # If no rides match the filters, return a list with 7 entries (one for each day of week) with zeroed stats
    if df.is_empty():
        return [
            DayOfWeekStats(
                day_of_week=day,
                total_rides=0,
                number_of_days=0,
                average_duration_seconds=0.0,
                average_distance_km=0.0,
                total_duration_seconds=0.0,
                total_distance_km=0.0,
            )
            for day in range(7)
        ]

    # Group by day of week and calculate stats for each group
    grouped = (
        # NOTE: Polars datetime weekday returns 1=Monday, 7=Sunday, so we adjust by subtracting 1 to match the 0=Monday, 6=Sunday convention
        df.group_by((pl.col("started_at").dt.weekday() - 1).alias("day_of_week"))
        .agg([
            pl.len().alias("total_rides"),
            # Count the number of unique days in the group to calculate average rides per day, ensuring we count only days that have rides
            pl.col("started_at").dt.date().n_unique().alias("number_of_days"),
            pl.col("trip_duration_seconds").mean().alias("average_duration_seconds"),
            pl.col("distance_km").mean().alias("average_distance_km"),
            pl.col("trip_duration_seconds").sum().alias("total_duration_seconds"),
            pl.col("distance_km").sum().alias("total_distance_km"),
        ])
    )

    # Ensure all days of the week are represented in the output, even if there are no rides for that day
    all_days = pl.DataFrame({"day_of_week": list(range(7))})
    grouped = (
        all_days.join(grouped, on="day_of_week", how="left")
        .with_columns([
            pl.col("total_rides").fill_null(0).cast(pl.Int64),
            pl.col("number_of_days").fill_null(0).cast(pl.Int64),
            pl.col("average_duration_seconds").fill_null(0.0),
            pl.col("average_distance_km").fill_null(0.0),
            pl.col("total_duration_seconds").fill_null(0.0),
            pl.col("total_distance_km").fill_null(0.0),
        ])
        .sort("day_of_week")
    )

    return [
        DayOfWeekStats(
            day_of_week=row["day_of_week"],
            total_rides=row["total_rides"],
            number_of_days=row["number_of_days"],
            average_duration_seconds=row["average_duration_seconds"],
            average_distance_km=row["average_distance_km"],
            total_duration_seconds=row["total_duration_seconds"],
            total_distance_km=row["total_distance_km"],
        )
        for row in grouped.iter_rows(named=True)
    ]


def get_station_ride_counts_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    station_id: str | None = None,
    limit: int = 100,
) -> list[StationRideCount]:
    # Get rides filtered by date range and optionally by station_id
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