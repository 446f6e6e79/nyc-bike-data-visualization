from datetime import date, timedelta

from src.backend.models.stats import RideCountGroupBy


# ── cursor helpers ────────────────────────────────────────────────────────────

def _rows(cur) -> list[dict]:
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _row(cur) -> dict:
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, cur.fetchone()))


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


# ── shared station-query helpers ──────────────────────────────────────────────

def _station_hours_count(group_by: RideCountGroupBy, start_date: date, end_date: date):
    if group_by == RideCountGroupBy.NONE:
        return _total_hours(start_date, end_date)
    if group_by == RideCountGroupBy.DAY_OF_WEEK:
        return _hours_by_dow(start_date, end_date)
    if group_by == RideCountGroupBy.HOUR:
        return _hours_per_day_in_range(start_date, end_date)
    if group_by == RideCountGroupBy.DAY_OF_WEEK_AND_HOUR:
        return _hours_by_dow_and_hour(start_date, end_date)


def _lookup_hours_count(hc, r: dict, group_by: RideCountGroupBy) -> int:
    if group_by == RideCountGroupBy.NONE:
        return int(hc)
    if group_by == RideCountGroupBy.DAY_OF_WEEK:
        return int(hc.get(r["day_of_week"], 0))
    if group_by == RideCountGroupBy.HOUR:
        return int(hc)
    if group_by == RideCountGroupBy.DAY_OF_WEEK_AND_HOUR:
        return int(hc.get((r["day_of_week"], r["hour"]), 0))
    return 0


# ── dataset coverage ──────────────────────────────────────────────────────────

from src.backend.db import get_conn
from src.backend.models.stats import DatasetDateRange


def get_data_range_coverage() -> DatasetDateRange:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT min_date, max_date FROM dataset_coverage WHERE id = 1")
            row = cur.fetchone()
    if row:
        return DatasetDateRange(min_date=row[0], max_date=row[1])
    return DatasetDateRange(min_date=None, max_date=None)
