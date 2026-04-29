"""Download GBFS station metadata and persist as parquet."""
import logging

import polars as pl

from config import PARQUET_COMPRESSION, STATION_METADATA_PATH
from src.backend.services.gbfs import fetch_station_data
from utils.cache import is_fresh

log = logging.getLogger(__name__)

def download_station_metadata(force_download: bool = False) -> list[dict]:
    """Return station metadata from the GBFS feed, refreshing the parquet cache when stale."""
    if not force_download and is_fresh(STATION_METADATA_PATH):
        log.info(f"[DOWNLOAD] Station metadata already fresh at {STATION_METADATA_PATH}, skipping")
        return pl.read_parquet(STATION_METADATA_PATH).to_dicts()

    station_info, _ = fetch_station_data(force_refresh=True)

    df = pl.DataFrame([
        {
            "station_id": s["station_id"],
            "short_name": s["short_name"],
            "name": s["name"],
            "lat": float(s["lat"]),
            "lon": float(s["lon"]),
            "capacity": int(s["capacity"]),
        }
        for s in station_info
    ])
    df.write_parquet(
        STATION_METADATA_PATH,
        row_group_size=100_000,
        statistics=True,
        compression=PARQUET_COMPRESSION,
    )
    log.info(f"[PROCESS] Wrote {len(station_info)} stations -> {STATION_METADATA_PATH}")
    return station_info
