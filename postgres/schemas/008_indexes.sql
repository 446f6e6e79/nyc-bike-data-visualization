-- stats_hourly
CREATE INDEX IF NOT EXISTS idx_sh_date 
ON stats_hourly (date);

-- station_activity_hourly
CREATE INDEX IF NOT EXISTS idx_sah_year_month
ON station_activity_hourly (year, month);

CREATE INDEX IF NOT EXISTS idx_sah_year_month_station
ON station_activity_hourly (year, month, station_id);

CREATE INDEX IF NOT EXISTS idx_sah_station
ON station_activity_hourly (station_id);

CREATE INDEX IF NOT EXISTS idx_sah_station_year_month
ON station_activity_hourly (station_id, year, month);

-- flow_activity_monthly
CREATE INDEX IF NOT EXISTS idx_fam_year_month
ON flow_activity_monthly (year, month);

CREATE INDEX IF NOT EXISTS idx_fam_station_a
ON flow_activity_monthly (station_a_id);

CREATE INDEX IF NOT EXISTS idx_fam_station_b
ON flow_activity_monthly (station_b_id);

-- weather_hourly
CREATE INDEX IF NOT EXISTS idx_wh_date
ON weather_hourly (date);

CREATE INDEX IF NOT EXISTS idx_wh_weather_code
ON weather_hourly (weather_code);
