CREATE TABLE IF NOT EXISTS flow_activity_daily (
    date            DATE         NOT NULL,
    station_a_id    VARCHAR(20)  NOT NULL,
    station_b_id    VARCHAR(20)  NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(20)  NOT NULL,
    a_to_b_count    INTEGER      NOT NULL DEFAULT 0,
    b_to_a_count    INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (date, station_a_id, station_b_id, user_type, bike_type)
);