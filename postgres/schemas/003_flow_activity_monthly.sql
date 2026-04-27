CREATE TABLE IF NOT EXISTS flow_activity_monthly (
    year            SMALLINT     NOT NULL,
    month           SMALLINT     NOT NULL,
    station_a_id    TEXT         NOT NULL,
    station_b_id    TEXT         NOT NULL,
    user_type       VARCHAR(10)  NOT NULL,
    bike_type       VARCHAR(50)  NOT NULL,
    a_to_b_count    INTEGER      NOT NULL DEFAULT 0,
    b_to_a_count    INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month, station_a_id, station_b_id, user_type, bike_type)
);
