-- Full granularity: year, month, day_of_week, hour, station, user_type, bike_type.
-- Used for group_by=DAY_OF_WEEK_AND_HOUR and as fallback when a day_of_week filter
-- is combined with group_by=HOUR.
CREATE TABLE IF NOT EXISTS station_activity_hourly (
    year            SMALLINT     NOT NULL,
    month           SMALLINT     NOT NULL,
    day_of_week     SMALLINT     NOT NULL,
    hour            SMALLINT     NOT NULL,
    station_id      TEXT         NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(50)  NOT NULL,
    outgoing_rides  INTEGER      NOT NULL DEFAULT 0,
    incoming_rides  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month, day_of_week, hour, station_id, user_type, bike_type)
);

-- Pre-aggregated variants: each collapses one or more dimensions to speed up
-- common query shapes without scanning the full hourly table.

-- Collapses day_of_week and hour — used for group_by=NONE
CREATE TABLE IF NOT EXISTS station_activity_by_month (
    year            SMALLINT     NOT NULL,
    month           SMALLINT     NOT NULL,
    station_id      TEXT         NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(50)  NOT NULL,
    outgoing_rides  INTEGER      NOT NULL DEFAULT 0,
    incoming_rides  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month, station_id, user_type, bike_type)
);

-- Collapses day_of_week — used for group_by=HOUR
CREATE TABLE IF NOT EXISTS station_activity_by_hour (
    year            SMALLINT     NOT NULL,
    month           SMALLINT     NOT NULL,
    hour            SMALLINT     NOT NULL,
    station_id      TEXT         NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(50)  NOT NULL,
    outgoing_rides  INTEGER      NOT NULL DEFAULT 0,
    incoming_rides  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month, hour, station_id, user_type, bike_type)
);

-- Collapses hour — used for group_by=DAY_OF_WEEK and group_by=NONE with a dow filter
CREATE TABLE IF NOT EXISTS station_activity_by_dow (
    year            SMALLINT     NOT NULL,
    month           SMALLINT     NOT NULL,
    day_of_week     SMALLINT     NOT NULL,
    station_id      TEXT         NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(50)  NOT NULL,
    outgoing_rides  INTEGER      NOT NULL DEFAULT 0,
    incoming_rides  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month, day_of_week, station_id, user_type, bike_type)
);
