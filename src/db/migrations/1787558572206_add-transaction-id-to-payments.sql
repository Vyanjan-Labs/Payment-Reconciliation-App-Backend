-- Up Migration

ALTER TABLE payments ADD COLUMN transaction_id VARCHAR(100) NOT NULL UNIQUE;

-- Down Migration

ALTER TABLE payments DROP COLUMN transaction_id;