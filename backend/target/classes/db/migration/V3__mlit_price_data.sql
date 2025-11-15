-- Flyway V3: MLIT Price data storage
CREATE TABLE IF NOT EXISTS mlit_price_query_log (
  id BIGSERIAL PRIMARY KEY,
  area VARCHAR(4),
  city VARCHAR(8),
  station VARCHAR(16),
  year VARCHAR(8),
  price_classification VARCHAR(4),
  quarter VARCHAR(4),
  language VARCHAR(8),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT,
  record_count INT,
  raw_json JSONB
);

CREATE TABLE IF NOT EXISTS mlit_price_record (
  id BIGSERIAL PRIMARY KEY,
  query_id BIGINT NOT NULL REFERENCES mlit_price_query_log(id) ON DELETE CASCADE,
  price_category TEXT,
  type TEXT,
  region TEXT,
  municipality_code VARCHAR(8),
  prefecture TEXT,
  municipality TEXT,
  district_name TEXT,
  trade_price_int BIGINT,
  price_per_unit_int BIGINT,
  floor_plan TEXT,
  area_num NUMERIC,
  unit_price_int BIGINT,
  exclusive_unit_price_int BIGINT,
  land_shape TEXT,
  frontage TEXT,
  total_floor_area_num NUMERIC,
  building_year TEXT,
  structure TEXT,
  use TEXT,
  purpose TEXT,
  direction TEXT,
  classification TEXT,
  breadth TEXT,
  city_planning TEXT,
  coverage_ratio TEXT,
  floor_area_ratio TEXT,
  period TEXT,
  renovation TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mlit_price_record_query ON mlit_price_record(query_id);
CREATE INDEX IF NOT EXISTS idx_mlit_price_record_muni ON mlit_price_record(municipality_code);
