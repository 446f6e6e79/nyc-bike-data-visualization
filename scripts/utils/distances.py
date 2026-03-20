import math
import polars as pl
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.backend.services.gbfs import fetch_station_data

from src.backend.config import STREET_CIRCUITY_FACTOR, PARQUET_COMPRESSION, STATION_DISTANCES_PATH

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

def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute the ditance in kilometers between two lat/lon points using the Haversine formula,
    multiplied by a circuity factor to approximate real-world travel distance.
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    d_lon = lon2 - lon1
    d_lat = lat2 - lat1
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return 6371 * c * STREET_CIRCUITY_FACTOR

def compute_and_save_station_distances(force_download: bool = False) -> None:
    """
    Compute unique undirected station-pair distances (haversine * 1.3) and save as parquet.
    Only keep GBFS stations that appear in ride data to avoid impossible pairs.
    Args:
        force_download (bool): Whether to force re-download of station data, even if it already exists.
    """
    if not force_download and _check_freshness(Path(STATION_DISTANCES_PATH)):
        print(f"Station distances file already exists at {STATION_DISTANCES_PATH}, skipping recomputation.")
        return
    raw_stations = fetch_station_data()[0]

    stations = []
    for station in raw_stations:
        stations.append(
            {
                "id": station.get("short_name", ""),
                "lat": float(station.get("lat", 0)),
                "lon": float(station.get("lon", 0)),
            }
        )

    # Keep deterministic ordering for pair generation and output stability.
    stations.sort(key=lambda s: s["id"])

    pair_rows = []

    print(f"Computing station-pair distances for {len(stations)} stations")
    for i, station_a in enumerate(stations):
        for station_b in stations[i + 1 :]:
            distance = _distance_km(
                station_a["lat"],
                station_a["lon"],
                station_b["lat"],
                station_b["lon"],
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
    print(f"Wrote {distances_df.height} station-pair distances to {STATION_DISTANCES_PATH}")
