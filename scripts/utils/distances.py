import logging
import math
import polars as pl
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.backend.services.gbfs import fetch_station_data
from config import STREET_CIRCUITY_FACTOR, PARQUET_COMPRESSION, STATION_DISTANCES_PATH

log = logging.getLogger(__name__)

def _check_freshness(file_path: Path, max_age_days: int = 30) -> bool:
    """
    Check if the file at the given path is fresh (i.e., not older than max_age_days).
    Args:
        file_path (Path): The path to the file to check.
        max_age_days (int): The maximum age of the file in days to be considered fresh.
    Returns:
        bool: True if the file is fresh, False otherwise.
    """
    if not file_path.exists():
        return False
    file_age_days = (date.today() - date.fromtimestamp(file_path.stat().st_mtime)).days
    return file_age_days <= max_age_days

def _distance_km(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    """
    Compute the ditance in kilometers between two lat/lon points using the Haversine formula,
    multiplied by a circuity factor to approximate real-world travel distance.
    """
    # Convert latitudes and longitudes from degrees to radians for the Haversine formula
    lat_a, lon_a, lat_b, lon_b = map(math.radians, [lat_a, lon_a, lat_b, lon_b])
    # Compute the delta in latitudes and longitudes
    d_lon = lon_b - lon_a
    d_lat = lat_b - lat_a
    # Apply the Haversine formula to compute the great-circle distance between the two points
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat_a) * math.cos(lat_b) * math.sin(d_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    # Multiply by the Earth's radius in kilometers and the circuity factor to get the estimated real-world distance
    return 6371 * c * STREET_CIRCUITY_FACTOR

def compute_and_save_station_distances(force_download: bool = False) -> None:
    """
    Compute unique undirected station-pair distances (haversine * 1.3) and save as parquet.
    Only keep GBFS stations that appear in ride data to avoid impossible pairs.
    Args:
        force_download (bool): Whether to force re-download of station data, even if it already exists.
    """
    # If the distances file already exists and is fresh, skip recomputation to save time
    if not force_download and _check_freshness(Path(STATION_DISTANCES_PATH)):
        log.info(f"[PROCESS] Station distances already exist at {STATION_DISTANCES_PATH}, skipping")
        return
    # Fetch raw station data
    raw_stations = fetch_station_data()[0]

    # Keep only relevant fields 
    stations = []
    for station in raw_stations:
        stations.append(
            {
                "id": station.get("short_name", ""),    # keep short_name as ID with consistency with ride data
                "lat": float(station.get("lat", 0)),
                "lon": float(station.get("lon", 0)),
            }
        )

    # Order stations by ID to ensure each pair is only computed once
    stations.sort(key=lambda s: s["id"])

    pair_rows = []

    log.info(f"[PROCESS] Computing distances for {len(stations)} stations...")
    # Each station is paired with every station that comes after it in the list to avoid duplicate pairs (A-B and B-A) and self-pairs (A-A)
    for i, station_a in enumerate(stations):
        for station_b in stations[i + 1 :]:
            distance = _distance_km(
                lat_a=station_a["lat"],
                lon_a=station_a["lon"],
                lat_b=station_b["lat"],
                lon_b=station_b["lon"],
            )
            pair_rows.append(
                {
                    "station_id_a": station_a["id"],
                    "station_id_b": station_b["id"],
                    "distance_km": distance,
                }
            )
    distances_df = pl.DataFrame(pair_rows)
    distances_df.write_parquet(
        STATION_DISTANCES_PATH,
        row_group_size=100_000,   # smaller = faster predicate pushdown
        statistics=True,           # enables min/max skipping
        compression=PARQUET_COMPRESSION,
    )
    log.info(f"[PROCESS] Wrote {distances_df.height} station distances -> {STATION_DISTANCES_PATH}")

def enrich_with_distances(rides: pl.LazyFrame, distances: pl.LazyFrame) -> pl.LazyFrame:
    """"""
    rides_norm = rides.with_columns([
        pl.min_horizontal("start_station_id", "end_station_id").alias("_station_min"),
        pl.max_horizontal("start_station_id", "end_station_id").alias("_station_max"),
    ])
    distances_sel = distances.select([
        pl.col("station_id_a").alias("_station_min"),
        pl.col("station_id_b").alias("_station_max"),
        "distance_km",
    ])
    return (
        rides_norm
        .join(distances_sel, on=["_station_min", "_station_max"], how="left")
        .drop(["_station_min", "_station_max"])
    )