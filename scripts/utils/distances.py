import math
import polars as pl
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.backend.services.gbfs import fetch_station_data

from src.backend.config import STREET_CIRCUITY_FACTOR, PARQUET_COMPRESSION, STATION_DISTANCES_PATH

#TODO: This is a placeholder for now, it's harvesine distance multiplied by a circuity factor to approximate real-world distances (street).
def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate straight-line distance in kilometers between two coordinates.
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    d_lon = lon2 - lon1
    d_lat = lat2 - lat1
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return 6371 * c

def compute_and_save_station_distances() -> None:
    """
    Compute unique undirected station-pair distances (haversine * 1.3) and save as parquet.
    Only keep GBFS stations that appear in ride data to avoid impossible pairs.
    """
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
            straight_line_km = distance_km(
                station_a["lat"],
                station_a["lon"],
                station_b["lat"],
                station_b["lon"],
            )
            distance = straight_line_km * STREET_CIRCUITY_FACTOR
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
