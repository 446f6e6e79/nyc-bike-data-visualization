from datetime import date, datetime

import polars as pl

from src.backend.services import stats as stats_service


def _rides_df(rows: list[dict]) -> pl.LazyFrame:
    return pl.DataFrame(rows).lazy()


def test_group_by_none_hours_count_infers_bounds_and_counts_empty_hours(monkeypatch):
    rides = _rides_df([
        {
            "started_at": datetime(2024, 1, 5, 5, 10),
            "trip_duration_seconds": 600.0,
            "distance_km": 1.2,
        },
        {
            "started_at": datetime(2024, 1, 5, 15, 20),
            "trip_duration_seconds": 900.0,
            "distance_km": 2.4,
        },
    ])

    monkeypatch.setattr(stats_service, "get_filtered_rides", lambda **_: rides)
    monkeypatch.setattr(stats_service, "add_trip_duration", lambda x: x)

    stats = stats_service.get_stats_data()

    assert stats.total_rides == 2
    assert stats.hours_count == 24


def test_group_by_none_hours_count_uses_explicit_range_when_empty(monkeypatch):
    empty_rides = _rides_df([]).with_columns([
        pl.lit(None).cast(pl.Datetime).alias("started_at"),
        pl.lit(None).cast(pl.Float64).alias("trip_duration_seconds"),
        pl.lit(None).cast(pl.Float64).alias("distance_km"),
    ]).head(0)

    monkeypatch.setattr(stats_service, "get_filtered_rides", lambda **_: empty_rides)
    monkeypatch.setattr(stats_service, "add_trip_duration", lambda x: x)

    stats = stats_service.get_stats_data(
        start_date=date(2024, 1, 5),
        end_date=date(2024, 1, 5),
        start_hour=5,
    )

    assert stats.total_rides == 0
    assert stats.hours_count == 1


def test_group_by_none_hours_count_respects_start_hour_over_multiple_days(monkeypatch):
    rides = _rides_df([
        {
            "started_at": datetime(2024, 1, 5, 5, 10),
            "trip_duration_seconds": 600.0,
            "distance_km": 1.2,
        },
        {
            "started_at": datetime(2024, 1, 6, 5, 40),
            "trip_duration_seconds": 700.0,
            "distance_km": 1.8,
        },
    ])

    monkeypatch.setattr(stats_service, "get_filtered_rides", lambda **_: rides)
    monkeypatch.setattr(stats_service, "add_trip_duration", lambda x: x)

    stats = stats_service.get_stats_data(start_hour=5)

    assert stats.total_rides == 2
    assert stats.hours_count == 2