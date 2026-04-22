CREATE TABLE IF NOT EXISTS bike_routes (
    segmentid   INTEGER      PRIMARY KEY,
    bikeid      INTEGER      NOT NULL,
    the_geom    TEXT         NOT NULL,
    street      VARCHAR(500) NOT NULL,
    fromstreet  VARCHAR(500) NOT NULL,
    tostreet    VARCHAR(500) NOT NULL,
    facilitycl  VARCHAR(5)   NOT NULL,
    instdate    DATE,
    boro        VARCHAR(20)
);
