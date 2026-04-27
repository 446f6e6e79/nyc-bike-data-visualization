CREATE TABLE IF NOT EXISTS station_metadata (
    station_id    TEXT PRIMARY KEY,
    station_name  VARCHAR(200),
    lat           DOUBLE PRECISION,
    lon           DOUBLE PRECISION
);