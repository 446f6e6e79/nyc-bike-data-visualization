from datetime import date
from src.backend.db import get_conn
from src.backend.models.ride import MemberCasual, RideableType
from src.backend.models.stats.stats import GroupedStats, Stats, StatsGroupBy
from src.backend.services.stats.utils import fetch_row, fetch_rows, total_hours

def get_stats_data(
    start_date: date,
    end_date: date,
    group_by: StatsGroupBy = StatsGroupBy.NONE,
    user_type: MemberCasual | None = None,
    bike_type: RideableType | None = None,
    group_by_weather: bool = False,
) -> Stats | list[GroupedStats]:
    """Fetch aggregated stats for rides in the given date range, optionally grouped by time dimensions and/or weather."""
    
    user_val = user_type.value if user_type else None
    bike_val = bike_type.value if bike_type else None
    # We need to repeat the user_val and bike_val twice for general SQL clause
    params_filter = (user_val, user_val, bike_val, bike_val)

    with get_conn() as conn:
        with conn.cursor() as cur:
            return _query_stats(cur, group_by, start_date, end_date, params_filter, group_by_weather)

def _query_stats(
    cur,
    group_by: StatsGroupBy,
    start_date: date,
    end_date: date,
    params_filter: tuple,
    group_by_weather: bool = False,
) -> Stats | list[GroupedStats]:
    base_params = (start_date, end_date, *params_filter)
    where_sh = (
        "sh.date BETWEEN %s AND %s "
        "AND (%s IS NULL OR sh.user_type = %s) "
        "AND (%s IS NULL OR sh.bike_type = %s)"
    )

    if group_by == StatsGroupBy.NONE and not group_by_weather:
        cur.execute("""
            SELECT SUM(total_rides)            AS total_rides,
                   SUM(total_duration_seconds) AS total_duration_seconds,
                   SUM(total_distance_km)      AS total_distance_km
            FROM stats_hourly sh
            WHERE sh.date BETWEEN %s AND %s
              AND (%s IS NULL OR sh.user_type = %s)
              AND (%s IS NULL OR sh.bike_type = %s)
        """, base_params)
        return _to_stats(fetch_row(cur), total_hours(start_date, end_date))

    if group_by == StatsGroupBy.NONE:
        time_sel = sh_time_sel = time_grp = sh_time_grp = res_sel = time_join = order_base = ""
    elif group_by == StatsGroupBy.DATE:
        time_sel    = "date"
        sh_time_sel = "sh.date"
        time_grp    = "date"
        sh_time_grp = "sh.date"
        res_sel     = "s.date"
        time_join   = "r.date = s.date"
        order_base  = "s.date"
    elif group_by == StatsGroupBy.DAY_OF_WEEK:
        time_sel    = "EXTRACT(ISODOW FROM date)::int - 1 AS day_of_week"
        sh_time_sel = "EXTRACT(ISODOW FROM sh.date)::int - 1 AS day_of_week"
        time_grp    = "EXTRACT(ISODOW FROM date)"
        sh_time_grp = "EXTRACT(ISODOW FROM sh.date)"
        res_sel     = "s.day_of_week"
        time_join   = "r.day_of_week = s.day_of_week"
        order_base  = "s.day_of_week"
    elif group_by == StatsGroupBy.HOUR:
        time_sel    = "hour"
        sh_time_sel = "sh.hour"
        time_grp    = "hour"
        sh_time_grp = "sh.hour"
        res_sel     = "s.hour"
        time_join   = "r.hour = s.hour"
        order_base  = "s.hour"
    elif group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        time_sel    = "EXTRACT(ISODOW FROM date)::int - 1 AS day_of_week, hour"
        sh_time_sel = "EXTRACT(ISODOW FROM sh.date)::int - 1 AS day_of_week, sh.hour"
        time_grp    = "EXTRACT(ISODOW FROM date), hour"
        sh_time_grp = "EXTRACT(ISODOW FROM sh.date), sh.hour"
        res_sel     = "s.day_of_week, s.hour"
        time_join   = "r.day_of_week = s.day_of_week AND r.hour = s.hour"
        order_base  = "s.day_of_week, s.hour"
    else:
        raise ValueError(f"Unsupported group_by: {group_by}")

    if group_by_weather:
        w_sel          = "weather_code"
        w_res          = "s.weather_code"
        w_join         = "r.weather_code = s.weather_code"
        w_filter       = "AND weather_code IS NOT NULL"
        rides_join     = "JOIN weather_hourly w ON w.date = sh.date AND w.hour = sh.hour"
        sh_w_sel       = "w.weather_code"
        w_rides_filter = "AND w.weather_code IS NOT NULL"
    else:
        w_sel = w_res = w_join = w_filter = rides_join = sh_w_sel = w_rides_filter = ""

    

    cur.execute(f"""
        WITH spine AS (
            SELECT {_cols(time_sel, w_sel, "COUNT(*) AS hours_count")}
            FROM weather_hourly
            WHERE date BETWEEN %s AND %s {w_filter}
            GROUP BY {_cols(time_grp, w_sel)}
        ),
        rides AS (
            SELECT {_cols(sh_time_sel, sh_w_sel,
                         "SUM(sh.total_rides) AS total_rides",
                         "SUM(sh.total_duration_seconds) AS total_duration_seconds",
                         "SUM(sh.total_distance_km) AS total_distance_km")}
            FROM stats_hourly sh {rides_join}
            WHERE {where_sh} {w_rides_filter}
            GROUP BY {_cols(sh_time_grp, sh_w_sel)}
        )
        SELECT {_cols(res_sel, w_res,
                     "COALESCE(r.total_rides, 0) AS total_rides",
                     "COALESCE(r.total_duration_seconds, 0) AS total_duration_seconds",
                     "COALESCE(r.total_distance_km, 0) AS total_distance_km",
                     "s.hours_count")}
        FROM spine s
        LEFT JOIN rides r ON {_conds(time_join, w_join) or "TRUE"}
        ORDER BY {_cols(order_base, w_res)}
    """, (start_date, end_date, *base_params))
    rows = [_to_grouped_stats(r, int(r["hours_count"])) for r in fetch_rows(cur)]
    if group_by_weather and group_by != StatsGroupBy.NONE:
        rows = _fill_weather_gaps(rows, group_by)
    return rows

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

def _fill_weather_gaps(rows: list[GroupedStats], group_by: StatsGroupBy) -> list[GroupedStats]:
    if group_by == StatsGroupBy.HOUR:
        time_keys = [{"hour": h} for h in range(24)]
        def key(r): return (r.weather_code, r.hour)
        def mk(wc, tk): return GroupedStats(weather_code=wc, hour=tk["hour"], **_zero_stats())
        def sort_key(r): return (r.weather_code, r.hour)
    elif group_by == StatsGroupBy.DAY_OF_WEEK:
        time_keys = [{"day_of_week": d} for d in range(7)]
        def key(r): return (r.weather_code, r.day_of_week)
        def mk(wc, tk): return GroupedStats(weather_code=wc, day_of_week=tk["day_of_week"], **_zero_stats())
        def sort_key(r): return (r.weather_code, r.day_of_week)
    elif group_by == StatsGroupBy.DAY_OF_WEEK_AND_HOUR:
        time_keys = [{"day_of_week": d, "hour": h} for d in range(7) for h in range(24)]
        def key(r): return (r.weather_code, r.day_of_week, r.hour)
        def mk(wc, tk): return GroupedStats(weather_code=wc, day_of_week=tk["day_of_week"], hour=tk["hour"], **_zero_stats())
        def sort_key(r): return (r.weather_code, r.day_of_week, r.hour)
    else:
        return rows

    existing = {key(r): r for r in rows}
    weather_codes = {r.weather_code for r in rows}
    result = []
    for wc in weather_codes:
        for tk in time_keys:
            k = (wc, *tk.values())
            result.append(existing.get(k) or mk(wc, tk))
    return sorted(result, key=sort_key)

def _zero_stats() -> dict:
    return dict(
        total_rides=0, hours_count=0,
        average_duration_seconds=0.0, average_distance_km=0.0,
        total_duration_seconds=0.0, total_distance_km=0.0,
        average_speed_kmh=0.0,
    )

def _cols(*parts):
    """Helper to combine SQL select/group/order parts, skipping any that are empty."""
    return ", ".join(p for p in parts if p)

def _conds(*conditions):
    """Helper to combine SQL join conditions, skipping any that are empty."""
    return " AND ".join(condition for condition in conditions if condition)