from datetime import date

from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats import GroupedStats, Stats, StatsGroupBy
from src.backend.services.stats.utils import (
    _hours_by_dow,
    _hours_by_dow_and_hour,
    _hours_per_day_in_range,
    _row,
    _rows,
    _total_hours,
)


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
