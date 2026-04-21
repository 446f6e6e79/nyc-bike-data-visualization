from datetime import date, timedelta

from fastapi import HTTPException

from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import (
    DatasetDateRange,
    GroupedStats,
    GroupedStationRideCount,
    GroupedTripsCountBetweenStations,
    RideCountGroupBy,
    Stats,
    StatsGroupBy,
    StationRideCounts,
    TripsCountBetweenStations,
)


# ── hours_count spine helpers ─────────────────────────────────────────────────

def _total_hours(start: date, end: date) -> int:
    return (end - start).days * 24 + 24


def _hours_by_dow(start: date, end: date) -> dict[int, int]:
    """Returns {dow: hours_count} for every weekday present in [start, end]."""
    counts: dict[int, int] = {}
    d = start
    while d <= end:
        counts[d.weekday()] = counts.get(d.weekday(), 0) + 24
        d += timedelta(days=1)
    return counts


def _hours_per_day_in_range(start: date, end: date) -> int:
    """Each of the 24 hour slots repeats once per day in the range."""
    return (end - start).days + 1


def _hours_by_dow_and_hour(start: date, end: date) -> dict[tuple[int, int], int]:
    """Returns {(dow, hour): count} — count = number of that weekday in range."""
    counts: dict[tuple[int, int], int] = {}
    d = start
    while d <= end:
        dow = d.weekday()
        for h in range(24):
            key = (dow, h)
            counts[key] = counts.get(key, 0) + 1
        d += timedelta(days=1)
    return counts


# ── row → model helpers ───────────────────────────────────────────────────────

def _to_grouped_stats(r: dict, hours_count: int) -> GroupedStats:
    total_rides = int(r.get("total_rides") or 0)
    total_dur   = float(r.get("total_duration_seconds") or 0.0)
    total_dist  = float(r.get("total_distance_km") or 0.0)
    return GroupedStats(
        day_of_week=r.get("day_of_week"),
        hour=r.get("hour"),
        weather_code=r.get("weather_code"),
        date=r.get("date"),
        total_rides=total_rides,
        hours_count=hours_count,
        average_duration_seconds=total_dur / total_rides if total_rides else 0.0,
        average_distance_km=total_dist / total_rides if total_rides else 0.0,
        total_duration_seconds=total_dur,
        total_distance_km=total_dist,
        average_speed_kmh=(total_dist / (total_dur / 3600)) if total_dur > 0 else 0.0,
    )


def _zero_grouped_stats(hours_count: int, **kwargs) -> GroupedStats:
    return GroupedStats(
        total_rides=0,
        hours_count=hours_count,
        average_duration_seconds=0.0,
        average_distance_km=0.0,
        total_duration_seconds=0.0,
        total_distance_km=0.0,
        average_speed_kmh=0.0,
        **kwargs,
    )


# ── WHERE clause helpers ──────────────────────────────────────────────────────

def _base_where() -> str:
    """Shared parameterised filter for user_type and bike_type (NULL = no filter)."""
    return "(%s IS NULL OR {col_user} = %s) AND (%s IS NULL OR {col_bike} = %s)"


# ── get_stats_data ────────────────────────────────────────────────────────────

def get_stats_data(
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    start_station_id: str | None = None,
    end_station_id: str | None = None,
) -> Stats | list[GroupedStats]:
    user_val = user_type.value if user_type else None
    bike_val = bike_type.value if bike_type else None
    params_filter = (user_val, user_val, bike_val, bike_val)

    with get_conn() as conn:
        with conn.cursor() as cur:
            return _query_stats(cur, group_by, start_date, end_date, params_filter)


def _query_stats(cur, group_by, start_date, end_date, params_filter):
    where = (
        "date BETWEEN %s AND %s "
        "AND (%s IS NULL OR user_type = %s) "
        "AND (%s IS NULL OR bike_type = %s)"
    )
    base_params = (start_date, end_date, *params_filter)

    if group_by == StatsGroupBy.NONE:
        cur.execute(f"""
            SELECT SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km
            FROM stats_hourly WHERE {where}
        """, base_params)
        r = _row(cur)
        return _to_stats(r, _total_hours(start_date, end_date))

    if group_by == StatsGroupBy.DATE:
        cur.execute(f"""
            SELECT date,
                   SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km
            FROM stats_hourly WHERE {where}
            GROUP BY date ORDER BY date
        """, base_params)
        return [_to_grouped_stats(r, 24) for r in _rows(cur)]

    if group_by == StatsGroupBy.DAY_OF_WEEK:
        cur.execute(f"""
            SELECT EXTRACT(ISODOW FROM date)::int - 1 AS day_of_week,
                   SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km
            FROM stats_hourly WHERE {where}
            GROUP BY 1 ORDER BY 1
        """, base_params)
        spine = _hours_by_dow(start_date, end_date)
        sql_map = {r["day_of_week"]: r for r in _rows(cur)}
        return [
            _to_grouped_stats(sql_map[dow], spine[dow]) if dow in sql_map
            else _zero_grouped_stats(spine[dow], day_of_week=dow)
            for dow in sorted(spine)
        ]

    if group_by == StatsGroupBy.HOUR:
        cur.execute(f"""
            SELECT hour,
                   SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km
            FROM stats_hourly WHERE {where}
            GROUP BY hour ORDER BY hour
        """, base_params)
        hc = _hours_per_day_in_range(start_date, end_date)
        sql_map = {r["hour"]: r for r in _rows(cur)}
        return [
            _to_grouped_stats(sql_map[h], hc) if h in sql_map
            else _zero_grouped_stats(hc, hour=h)
            for h in range(24)
        ]

    if group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        cur.execute(f"""
            SELECT EXTRACT(ISODOW FROM date)::int - 1 AS day_of_week,
                   hour,
                   SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km
            FROM stats_hourly WHERE {where}
            GROUP BY 1, 2 ORDER BY 1, 2
        """, base_params)
        spine = _hours_by_dow_and_hour(start_date, end_date)
        sql_map = {(r["day_of_week"], r["hour"]): r for r in _rows(cur)}
        return [
            _to_grouped_stats(sql_map[key], spine[key]) if key in sql_map
            else _zero_grouped_stats(spine[key], day_of_week=key[0], hour=key[1])
            for key in sorted(spine)
        ]

    if group_by == StatsGroupBy.WEATHER_CODE:
        cur.execute(f"""
            SELECT weather_code,
                   SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km,
                   COUNT(DISTINCT date::text || hour::text) AS hours_count
            FROM stats_hourly
            WHERE {where} AND weather_code IS NOT NULL
            GROUP BY weather_code ORDER BY weather_code
        """, base_params)
        return [_to_grouped_stats(r, int(r["hours_count"])) for r in _rows(cur)]

    raise ValueError(f"Unsupported group_by: {group_by}")


def _to_stats(r: dict, hours_count: int) -> Stats:
    total_rides = int(r.get("total_rides") or 0)
    total_dur   = float(r.get("total_duration_seconds") or 0.0)
    total_dist  = float(r.get("total_distance_km") or 0.0)
    return Stats(
        total_rides=total_rides,
        hours_count=hours_count,
        average_duration_seconds=total_dur / total_rides if total_rides else 0.0,
        average_distance_km=total_dist / total_rides if total_rides else 0.0,
        total_duration_seconds=total_dur,
        total_distance_km=total_dist,
        average_speed_kmh=(total_dist / (total_dur / 3600)) if total_dur > 0 else 0.0,
    )


# ── get_station_ride_counts_stats ─────────────────────────────────────────────

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

    # Build the time-dimension SELECT / GROUP BY fragment
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

    # Group by station, accumulate total for ranking
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

    # Rank and trim
    top = sorted(by_station.values(), key=lambda s: s["station_total"], reverse=True)[:limit]

    # Compute hours_count per group bucket
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


def _station_hours_count(group_by, start_date, end_date):
    if group_by == RideCountGroupBy.NONE:
        return _total_hours(start_date, end_date)
    if group_by == RideCountGroupBy.DAY_OF_WEEK:
        return _hours_by_dow(start_date, end_date)
    if group_by == RideCountGroupBy.HOUR:
        return _hours_per_day_in_range(start_date, end_date)
    if group_by == RideCountGroupBy.DAY_OF_WEEK_AND_HOUR:
        return _hours_by_dow_and_hour(start_date, end_date)


def _lookup_hours_count(hc, r, group_by) -> int:
    if group_by == RideCountGroupBy.NONE:
        return int(hc)
    if group_by == RideCountGroupBy.DAY_OF_WEEK:
        return int(hc.get(r["day_of_week"], 0))
    if group_by == RideCountGroupBy.HOUR:
        return int(hc)
    if group_by == RideCountGroupBy.DAY_OF_WEEK_AND_HOUR:
        return int(hc.get((r["day_of_week"], r["hour"]), 0))
    return 0


# ── get_trips_between_stations_stats ─────────────────────────────────────────

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


# ── get_data_range_coverage ───────────────────────────────────────────────────

def get_data_range_coverage() -> DatasetDateRange:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT min_date, max_date FROM dataset_coverage WHERE id = 1")
            row = cur.fetchone()
    if row:
        return DatasetDateRange(min_date=row[0], max_date=row[1])
    return DatasetDateRange(min_date=None, max_date=None)


# ── cursor helpers ────────────────────────────────────────────────────────────

def _rows(cur) -> list[dict]:
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _row(cur) -> dict:
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))
