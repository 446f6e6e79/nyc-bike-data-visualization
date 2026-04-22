from datetime import date

from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats.station_ride_counts import GroupedStationRideCount, StationRideGroupBy, StationRideCounts
from src.backend.services.stats.utils import fetch_rows

def get_station_ride_counts_stats(
    start_date: date,
    end_date: date,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    group_by: StationRideGroupBy = StationRideGroupBy.NONE,
    limit: int = 100,
) -> list[StationRideCounts]:
    user_val = user_type.value if user_type else None
    bike_val = bike_type.value if bike_type else None

    start_ym = start_date.year * 100 + start_date.month
    end_ym = end_date.year * 100 + end_date.month

    if group_by == StationRideGroupBy.NONE:
        spine_dim  = ""
        spine_grp  = ""
        sah_sel    = ""
        sah_grp    = ", s.hours_count"
        spine_join = "CROSS JOIN spine s"
    elif group_by == StationRideGroupBy.DAY_OF_WEEK:
        spine_dim  = "EXTRACT(ISODOW FROM date)::int - 1 AS day_of_week, "
        spine_grp  = "GROUP BY 1"
        sah_sel    = ", sah.day_of_week"
        sah_grp    = ", sah.day_of_week, s.hours_count"
        spine_join = "JOIN spine s ON s.day_of_week = sah.day_of_week"
    elif group_by == StationRideGroupBy.HOUR:
        spine_dim  = "hour, "
        spine_grp  = "GROUP BY hour"
        sah_sel    = ", sah.hour"
        sah_grp    = ", sah.hour, s.hours_count"
        spine_join = "JOIN spine s ON s.hour = sah.hour"
    elif group_by == StationRideGroupBy.DAY_OF_WEEK_AND_HOUR:
        spine_dim  = "EXTRACT(ISODOW FROM date)::int - 1 AS day_of_week, hour, "
        spine_grp  = "GROUP BY 1, 2"
        sah_sel    = ", sah.day_of_week, sah.hour"
        sah_grp    = ", sah.day_of_week, sah.hour, s.hours_count"
        spine_join = "JOIN spine s ON s.day_of_week = sah.day_of_week AND s.hour = sah.hour"

    sql = f"""
        WITH spine AS (
            SELECT {spine_dim}COUNT(*) AS hours_count
            FROM weather_hourly
            WHERE date BETWEEN %s AND %s
            {spine_grp}
        )
        SELECT sah.station_id, sm.station_name, sm.lat, sm.lon{sah_sel},
               SUM(sah.outgoing_rides) AS outgoing_rides,
               SUM(sah.incoming_rides) AS incoming_rides,
               SUM(sah.outgoing_rides + sah.incoming_rides) AS total_rides,
               s.hours_count
        FROM station_activity_hourly sah
        JOIN station_metadata sm ON sm.station_id = sah.station_id
        {spine_join}
        WHERE sah.year * 100 + sah.month BETWEEN %s AND %s
          AND (%s IS NULL OR sah.station_id = %s)
          AND (%s IS NULL OR sah.user_type = %s)
          AND (%s IS NULL OR sah.bike_type = %s)
        GROUP BY sah.station_id, sm.station_name, sm.lat, sm.lon{sah_grp}
    """
    params = (
        start_date, end_date,
        start_ym, end_ym,
        station_id, station_id,
        user_val, user_val,
        bike_val, bike_val,
    )

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = fetch_rows(cur)

    by_station: dict[str, dict] = {}
    for r in rows:
        sid = r["station_id"]
        if sid not in by_station:
            by_station[sid] = {
                "station_id": sid,
                "station_name": r["station_name"],
                "lat": r["lat"],
                "lon": r["lon"],
                "station_total": 0,
                "groups": [],
            }
        by_station[sid]["station_total"] += int(r["total_rides"] or 0)
        by_station[sid]["groups"].append(r)

    top = sorted(by_station.values(), key=lambda s: s["station_total"], reverse=True)[:limit]

    result = []
    for station in top:
        groups = [
            GroupedStationRideCount(
                day_of_week=r.get("day_of_week"),
                hour=r.get("hour"),
                outgoing_rides=int(r.get("outgoing_rides") or 0),
                incoming_rides=int(r.get("incoming_rides") or 0),
                total_rides=int(r.get("total_rides") or 0),
                hours_count=int(r["hours_count"]),
            )
            for r in station["groups"]
        ]
        groups.sort(key=lambda g: (
            g.day_of_week if g.day_of_week is not None else -1,
            g.hour if g.hour is not None else -1,
        ))
        result.append(StationRideCounts(
            station_id=station["station_id"],
            station_name=station["station_name"],
            lat=station["lat"],
            lon=station["lon"],
            groups=groups,
        ))
    return result
