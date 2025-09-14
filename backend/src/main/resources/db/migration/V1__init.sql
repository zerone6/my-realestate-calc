-- Flyway V1: Initial schema for municipalities cache
CREATE TABLE IF NOT EXISTS prefecture (
  code CHAR(2) PRIMARY KEY,
  name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS municipality (
  id CHAR(5) PRIMARY KEY,
  name TEXT NOT NULL,
  prefecture_code CHAR(2) NOT NULL REFERENCES prefecture(code) ON UPDATE CASCADE ON DELETE CASCADE,
  geom geometry(Point, 4326),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_municipality_pref ON municipality(prefecture_code);

CREATE TABLE IF NOT EXISTS mlit_cache_meta (
  key TEXT PRIMARY KEY,
  last_refreshed TIMESTAMPTZ NOT NULL,
  source TEXT
);