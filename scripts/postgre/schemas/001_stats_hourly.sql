-- 001_stats_hourly.sql
-- Define the schema for the stats_hourly table, which aggregates ride data by DATE, HOUR, USER_TYPE, and BIKE_TYPE. 
CREATE TABLE IF NOT EXISTS stats_hourly (
    date                    DATE             NOT NULL,
    hour                    SMALLINT         NOT NULL,
    day_of_week             SMALLINT         NOT NULL,
    user_type               VARCHAR(10)      NOT NULL,
    bike_type               VARCHAR(20)      NOT NULL,
    total_rides             BIGINT           NOT NULL DEFAULT 0,
    total_duration_seconds  DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_distance_km       DOUBLE PRECISION NOT NULL DEFAULT 0,
    PRIMARY KEY (date, hour, user_type, bike_type)
);