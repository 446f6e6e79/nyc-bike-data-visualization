from datetime import date

from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import GroupedStationRideCount, RideCountGroupBy, StationRideCounts
from src.backend.services.stats.utils import _lookup_hours_count, _rows, _station_hours_count


def get_station_ride_counts_stats(
    start_date: date,
    end_date: date,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    group_by: RideCountGroupBy = RideCountGroupBy.NONE,
    limit: int = 100,
) -> list[StationRideCounts]:
    user_val = user_type.value if user_type else None
    bike_val = bike_type.value if bike_type else None

    if group_by == RideCountGroupBy.DAY_OF_WEEK:
        time_select = ", EXTRACT(ISODOW FROM sah.date)::int - 1 AS day_of_week"
        time_group  = ", EXTRACT(ISODOW FROM sah.date)"
    elif group_by == RideCountGroupBy.HOUR:
        time_select = ", sah.hour"
        time_group  = ", sah.hour"
    elif group_by == RideCountGroupBy.DAY_OF_WEEK_AND_HOUR:
        time_select = ", EXTRACT(ISODOW FROM sah.date)::int - 1 AS day_of_week, sah.hour"
        time_group  = ", EXTRACT(ISODOW FROM sah.date), sah.hour"
    else:
        time_select = ""
        time_group  = ""

    sql = f"""
        SELECT sah.station_id,
               sm.station_name, sm.lat, sm.lon
               {time_select},
               SUM(sah.outgoing_rides) AS outgoing_rides,
               SUM(sah.incoming_rides) AS incoming_rides,
               SUM(sah.outgoing_rides + sah.incoming_rides) AS total_rides
        FROM station_activity_hourly sah
        JOIN station_metadata sm ON sm.station_id = sah.station_id
        WHERE sah.date BETWEEN %s AND %s
          AND (%s IS NULL OR sah.station_id = %s)
          AND (%s IS NULL OR sah.user_type = %s)
          AND (%s IS NULL OR sah.bike_type = %s)
        GROUP BY sah.station_id, sm.station_name, sm.lat, sm.lon{time_group}
    """
    params = (
        start_date, end_date,
        station_id, station_id,
        user_val, user_val,
        bike_val, bike_val,
    )

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = _rows(cur)

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

    hc = _station_hours_count(group_by, start_date, end_date)

    result = []
    for station in top:
        groups = [
            GroupedStationRideCount(
                day_of_week=r.get("day_of_week"),
                hour=r.get("hour"),
                outgoing_rides=int(r.get("outgoing_rides") or 0),
                incoming_rides=int(r.get("incoming_rides") or 0),
                total_rides=int(r.get("total_rides") or 0),
                hours_count=_lookup_hours_count(hc, r, group_by),
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
