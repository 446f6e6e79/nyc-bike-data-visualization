-- 008_weather_hourly.sql
-- Hourly weather source-of-truth used by stats queries, including hours with zero rides.
CREATE TABLE IF NOT EXISTS weather_hourly (
    date            DATE             NOT NULL,
    hour            SMALLINT         NOT NULL,
    weather_code    SMALLINT,
    temperature_2m  DOUBLE PRECISION,
    precipitation   DOUBLE PRECISION,
    wind_speed_10m  DOUBLE PRECISION,
    PRIMARY KEY (date, hour)
);
