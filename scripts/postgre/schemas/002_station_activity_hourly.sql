CREATE TABLE IF NOT EXISTS station_activity_hourly (
    date            DATE         NOT NULL,
    hour            SMALLINT     NOT NULL,
    day_of_week     SMALLINT     NOT NULL,
    station_id      VARCHAR(20)  NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(20)  NOT NULL,
    outgoing_rides  INTEGER      NOT NULL DEFAULT 0,
    incoming_rides  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (date, hour, station_id, user_type, bike_type)
);