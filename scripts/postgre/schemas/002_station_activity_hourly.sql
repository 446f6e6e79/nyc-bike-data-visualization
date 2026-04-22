-- 002_station_activity_hourly.sql
-- Define the schema for the station_activity_hourly table, which aggregates ride data by YEAR,
-- MONTH, DAY_OF_WEEK, HOUR, STATION_ID, USER_TYPE, and BIKE_TYPE.
CREATE TABLE IF NOT EXISTS station_activity_hourly (
    year            SMALLINT     NOT NULL,
    month           SMALLINT     NOT NULL,
    day_of_week     SMALLINT     NOT NULL,
    hour            SMALLINT     NOT NULL,
    station_id      VARCHAR(20)  NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(20)  NOT NULL,
    outgoing_rides  INTEGER      NOT NULL DEFAULT 0,
    incoming_rides  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month, day_of_week, hour, station_id, user_type, bike_type)
);
