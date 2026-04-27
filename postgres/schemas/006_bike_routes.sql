CREATE TABLE IF NOT EXISTS bike_routes (
    segmentid           INTEGER      NOT NULL,
    bikeid              INTEGER      NOT NULL,
    status              VARCHAR(20)  NOT NULL,
    installation_date   DATE         NOT NULL,
    retired_date        DATE,
    the_geom            TEXT         NOT NULL,
    street              VARCHAR(500) NOT NULL,
    fromstreet          VARCHAR(500) NOT NULL,
    tostreet            VARCHAR(500) NOT NULL,
    facilitycl          VARCHAR(5)   NOT NULL,
    instdate            DATE,
    boro                VARCHAR(20),
    PRIMARY KEY (segmentid, installation_date)
);