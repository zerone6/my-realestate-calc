-- Flyway V2: Property data storage
CREATE TABLE IF NOT EXISTS property_data (
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  form_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_property_data_user ON property_data(user_id);
