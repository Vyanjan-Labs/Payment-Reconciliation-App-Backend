-- Up Migration

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  reference_number VARCHAR(100),
  payer_name VARCHAR(255),
  amount NUMERIC(14,2) NOT NULL,
  amount_matched NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  payment_date DATE NOT NULL,
  description TEXT,
  raw_row JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('unmatched', 'partially_matched', 'matched')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_amount_date ON payments(amount, payment_date);

-- Down Migration

DROP TABLE payments;