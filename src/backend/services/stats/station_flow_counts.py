from datetime import date

from fastapi import HTTPException

from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import GroupedTripsCountBetweenStations, RideCountGroupBy, TripsCountBetweenStations
from src.backend.services.stats.utils import _lookup_hours_count, _rows, _station_hours_count


def get_trips_between_stations_stats(
    start_date: date,
    end_date: date,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    group_by: RideCountGroupBy = RideCountGroupBy.NONE,
    limit: int = 100,
) -> list[TripsCountBetweenStations]:
    if group_by in (RideCountGroupBy.HOUR, RideCountGroupBy.DAY_OF_WEEK_AND_HOUR, RideCountGroupBy.DAY_OF_WEEK):
        raise HTTPException(
            status_code=422,
            detail="Sub-monthly grouping is not supported for station flow counts",
        )

    user_val = user_type.value if user_type else None
    bike_val = bike_type.value if bike_type else None

    start_ym = start_date.year * 100 + start_date.month
    end_ym = end_date.year * 100 + end_date.month

    sql = """
        SELECT fam.station_a_id,
               sm_a.station_name AS station_a_name,
               sm_a.lat AS station_a_lat, sm_a.lon AS station_a_lon,
               fam.station_b_id,
               sm_b.station_name AS station_b_name,
               sm_b.lat AS station_b_lat, sm_b.lon AS station_b_lon,
               SUM(fam.a_to_b_count) AS a_to_b_count,
               SUM(fam.b_to_a_count) AS b_to_a_count,
               SUM(fam.a_to_b_count + fam.b_to_a_count) AS total_rides
        FROM flow_activity_monthly fam
        JOIN station_metadata sm_a ON sm_a.station_id = fam.station_a_id
        JOIN station_metadata sm_b ON sm_b.station_id = fam.station_b_id
        WHERE (fam.year * 100 + fam.month) BETWEEN %s AND %s
          AND (%s IS NULL OR fam.station_a_id = %s OR fam.station_b_id = %s)
          AND (%s IS NULL OR fam.user_type = %s)
          AND (%s IS NULL OR fam.bike_type = %s)
        GROUP BY fam.station_a_id, fam.station_b_id,
                 sm_a.station_name, sm_a.lat, sm_a.lon,
                 sm_b.station_name, sm_b.lat, sm_b.lon
    """
    params = (
        start_ym, end_ym,
        station_id, station_id, station_id,
        user_val, user_val,
        bike_val, bike_val,
    )

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = _rows(cur)

    by_pair: dict[tuple[str, str], dict] = {}
    for r in rows:
        key = (r["station_a_id"], r["station_b_id"])
        if key not in by_pair:
            by_pair[key] = {
                "station_a_id": r["station_a_id"],
                "station_a_name": r["station_a_name"],
                "station_a_lat": r["station_a_lat"],
                "station_a_lon": r["station_a_lon"],
                "station_b_id": r["station_b_id"],
                "station_b_name": r["station_b_name"],
                "station_b_lat": r["station_b_lat"],
                "station_b_lon": r["station_b_lon"],
                "pair_total": 0,
                "groups": [],
            }
        by_pair[key]["pair_total"] += int(r["total_rides"] or 0)
        by_pair[key]["groups"].append(r)

    top = sorted(by_pair.values(), key=lambda p: p["pair_total"], reverse=True)[:limit]

    hc = _station_hours_count(group_by, start_date, end_date)

    result = []
    for pair in top:
        groups = [
            GroupedTripsCountBetweenStations(
                day_of_week=r.get("day_of_week"),
                hour=None,
                a_to_b_count=int(r.get("a_to_b_count") or 0),
                b_to_a_count=int(r.get("b_to_a_count") or 0),
                total_rides=int(r.get("total_rides") or 0),
                hours_count=_lookup_hours_count(hc, r, group_by),
            )
            for r in pair["groups"]
        ]
        groups.sort(key=lambda g: g.day_of_week if g.day_of_week is not None else -1)
        result.append(TripsCountBetweenStations(
            station_a_id=pair["station_a_id"],
            station_a_name=pair["station_a_name"],
            station_a_lat=pair["station_a_lat"],
            station_a_lon=pair["station_a_lon"],
            station_b_id=pair["station_b_id"],
            station_b_name=pair["station_b_name"],
            station_b_lat=pair["station_b_lat"],
            station_b_lon=pair["station_b_lon"],
            groups=groups,
        ))
    return result
