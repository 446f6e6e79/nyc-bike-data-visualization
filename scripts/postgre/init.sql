-- psql-only schema bootstrap entrypoint.
-- Use with: psql "$DATABASE_URL" -f scripts/postgre/init.sql
-- Note: pg_loader executes scripts/postgre/schemas/*.sql directly (not this file).

\ir schemas/001_stats_hourly.sql
\ir schemas/002_station_activity_hourly.sql
\ir schemas/003_flow_activity_daily.sql
\ir schemas/004_station_metadata.sql
\ir schemas/005_dataset_coverage.sql
\ir schemas/006_indexes.sql
