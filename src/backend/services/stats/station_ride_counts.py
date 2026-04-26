import datetime

from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats.station_ride_counts import GroupedStationRideCount, StationRideGroupBy, StationRideCounts
from src.backend.services.stats.utils import fetch_rows

def get_station_ride_counts_stats(
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    station_id: str | None = None,
    day_of_week: int | None = None,
    group_by: StationRideGroupBy = StationRideGroupBy.NONE,
    limit: int = 100,
) -> list[StationRideCounts]:
    user_val = user_type.value if user_type else None
    bike_val = bike_type.value if bike_type else None

    start_date = datetime.date(start_year, start_month, 1)
    end_date = datetime.date(end_year + (end_month == 12), end_month % 12 + 1, 1)

    # Pick the smallest pre-aggregated table that satisfies the query shape.
    # Falls back to station_activity_hourly only when both day_of_week and hour are needed.
    if group_by == StationRideGroupBy.DAY_OF_WEEK_AND_HOUR:
        table       = "station_activity_hourly"
        spine_dim   = "day_of_week, hour, "
        spine_grp   = "GROUP BY day_of_week, hour"
        spine_extra = ""
        sah_sel     = ", sah.day_of_week, sah.hour"
        sah_grp     = ", sah.day_of_week, sah.hour, s.hours_count"
        spine_join  = "JOIN spine s ON s.day_of_week = sah.day_of_week AND s.hour = sah.hour"
        has_dow_col = True
    elif group_by == StationRideGroupBy.HOUR and day_of_week is not None:
        # Need to filter by dow AND group by hour — only the full table has both columns
        table       = "station_activity_hourly"
        spine_dim   = "hour, "
        spine_grp   = "GROUP BY hour"
        spine_extra = "AND day_of_week = %s"
        sah_sel     = ", sah.hour"
        sah_grp     = ", sah.hour, s.hours_count"
        spine_join  = "JOIN spine s ON s.hour = sah.hour"
        has_dow_col = True
    elif group_by == StationRideGroupBy.HOUR:
        table       = "station_activity_by_hour"
        spine_dim   = "hour, "
        spine_grp   = "GROUP BY hour"
        spine_extra = ""
        sah_sel     = ", sah.hour"
        sah_grp     = ", sah.hour, s.hours_count"
        spine_join  = "JOIN spine s ON s.hour = sah.hour"
        has_dow_col = False
    elif group_by == StationRideGroupBy.DAY_OF_WEEK:
        table       = "station_activity_by_dow"
        spine_dim   = "day_of_week, "
        spine_grp   = "GROUP BY day_of_week"
        spine_extra = ""
        sah_sel     = ", sah.day_of_week"
        sah_grp     = ", sah.day_of_week, s.hours_count"
        spine_join  = "JOIN spine s ON s.day_of_week = sah.day_of_week"
        has_dow_col = True
    elif day_of_week is not None:
        # NONE group_by with a dow filter: by_dow is small and has the column
        table       = "station_activity_by_dow"
        spine_dim   = ""
        spine_grp   = ""
        spine_extra = "AND day_of_week = %s"
        sah_sel     = ""
        sah_grp     = ", s.hours_count"
        spine_join  = "CROSS JOIN spine s"
        has_dow_col = True
    else:
        # NONE group_by, no dow filter: smallest possible table
        table       = "station_activity_by_month"
        spine_dim   = ""
        spine_grp   = ""
        spine_extra = ""
        sah_sel     = ""
        sah_grp     = ", s.hours_count"
        spine_join  = "CROSS JOIN spine s"
        has_dow_col = False

    spine_params = [start_date, end_date]
    if spine_extra:
        spine_params.append(day_of_week)

    dow_where  = "AND (%s IS NULL OR sah.day_of_week = %s)" if has_dow_col else ""
    dow_params = (day_of_week, day_of_week) if has_dow_col else ()

    sql = f"""
        WITH spine AS (
            SELECT {spine_dim}COUNT(*) AS hours_count
            FROM weather_hourly
            WHERE date >= %s AND date < %s
            {spine_extra}
            {spine_grp}
        )
        SELECT sah.station_id, sm.station_name, sm.lat, sm.lon{sah_sel},
               SUM(sah.outgoing_rides) AS outgoing_rides,
               SUM(sah.incoming_rides) AS incoming_rides,
               SUM(sah.outgoing_rides + sah.incoming_rides) AS total_rides,
               s.hours_count
        FROM {table} sah
        JOIN station_metadata sm ON sm.station_id = sah.station_id
        {spine_join}
        WHERE (sah.year, sah.month) >= (%s, %s) AND (sah.year, sah.month) <= (%s, %s)
          AND (%s IS NULL OR sah.station_id = %s)
          AND (%s IS NULL OR sah.user_type = %s)
          AND (%s IS NULL OR sah.bike_type = %s)
          {dow_where}
        GROUP BY sah.station_id, sm.station_name, sm.lat, sm.lon{sah_grp}
    """
    params = (
        *spine_params,
        start_year, start_month, end_year, end_month,
        station_id, station_id,
        user_val, user_val,
        bike_val, bike_val,
        *dow_params,
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
        raw_groups = _fill_station_groups(station["groups"], group_by)
        groups = [
            GroupedStationRideCount(
                day_of_week=r.get("day_of_week"),
                hour=r.get("hour"),
                outgoing_rides=int(r.get("outgoing_rides") or 0),
                incoming_rides=int(r.get("incoming_rides") or 0),
                total_rides=int(r.get("total_rides") or 0),
                hours_count=int(r.get("hours_count") or 0),
            )
            for r in raw_groups
        ]
        result.append(StationRideCounts(
            station_id=station["station_id"],
            station_name=station["station_name"],
            lat=station["lat"],
            lon=station["lon"],
            groups=groups,
        ))
    return result


def _fill_station_groups(groups: list[dict], group_by: StationRideGroupBy) -> list[dict]:
    if group_by == StationRideGroupBy.NONE:
        return groups

    if group_by == StationRideGroupBy.HOUR:
        all_keys = [(None, h) for h in range(24)]
        def row_key(r): return (None, r.get("hour"))
    elif group_by == StationRideGroupBy.DAY_OF_WEEK:
        all_keys = [(d, None) for d in range(7)]
        def row_key(r): return (r.get("day_of_week"), None)
    elif group_by == StationRideGroupBy.DAY_OF_WEEK_AND_HOUR:
        all_keys = [(d, h) for d in range(7) for h in range(24)]
        def row_key(r): return (r.get("day_of_week"), r.get("hour"))

    existing = {row_key(r): r for r in groups}
    result = []
    for dow, h in all_keys:
        k = (dow, h)
        result.append(existing.get(k) or {
            "day_of_week": dow, "hour": h,
            "outgoing_rides": 0, "incoming_rides": 0,
            "total_rides": 0, "hours_count": 0,
        })
    return result
