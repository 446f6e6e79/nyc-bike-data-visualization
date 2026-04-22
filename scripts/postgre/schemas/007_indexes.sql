-- stats_hourly
CREATE INDEX IF NOT EXISTS idx_sh_date 
ON stats_hourly (date);

-- station_activity_hourly
CREATE INDEX IF NOT EXISTS idx_sah_date
ON station_activity_hourly (date);

CREATE INDEX IF NOT EXISTS idx_sah_date_station 
ON station_activity_hourly (date, station_id);

CREATE INDEX IF NOT EXISTS idx_sah_station 
ON station_activity_hourly (station_id);

-- flow_activity_monthly
CREATE INDEX IF NOT EXISTS idx_fam_year_month
ON flow_activity_monthly (year, month);

CREATE INDEX IF NOT EXISTS idx_fam_station_a
ON flow_activity_monthly (station_a_id);

CREATE INDEX IF NOT EXISTS idx_fam_station_b
ON flow_activity_monthly (station_b_id);