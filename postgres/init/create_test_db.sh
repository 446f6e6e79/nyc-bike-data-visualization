#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE citibike_test;
    GRANT ALL PRIVILEGES ON DATABASE citibike_test TO $POSTGRES_USER;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "citibike_test" <<-EOSQL
    GRANT ALL ON SCHEMA public TO $POSTGRES_USER;
EOSQL
