-- stats_hourly
CREATE INDEX IF NOT EXISTS idx_sh_date 
ON stats_hourly (date);

-- station_activity_hourly
CREATE INDEX IF NOT EXISTS idx_sah_date_station 
ON station_activity_hourly (date, station_id);

CREATE INDEX IF NOT EXISTS idx_sah_station 
ON station_activity_hourly (station_id);

-- flow_activity_daily
CREATE INDEX IF NOT EXISTS idx_fad_date 
ON flow_activity_daily (date);

CREATE INDEX IF NOT EXISTS idx_fad_station_a 
ON flow_activity_daily (station_a_id);

CREATE INDEX IF NOT EXISTS idx_fad_station_b 
ON flow_activity_daily (station_b_id);