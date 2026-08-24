-- Up Migration

CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id),
  payment_id BIGINT NOT NULL REFERENCES payments(id),
  match_type VARCHAR(20) NOT NULL
    CHECK (match_type IN ('exact', 'fuzzy', 'manual')),
  match_score NUMERIC(5,2),
  matched_amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'needs_review', 'rejected')),
  matched_by VARCHAR(20) NOT NULL DEFAULT 'system'
    CHECK (matched_by IN ('system', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, payment_id)
);

CREATE INDEX idx_matches_invoice_id ON matches(invoice_id);
CREATE INDEX idx_matches_payment_id ON matches(payment_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Down Migration

DROP TABLE matches;