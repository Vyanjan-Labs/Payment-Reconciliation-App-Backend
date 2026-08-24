-- Up Migration

ALTER TABLE payments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Down Migration

ALTER TABLE payments DROP COLUMN updated_at;