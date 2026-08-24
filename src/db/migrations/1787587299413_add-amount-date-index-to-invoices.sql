-- Up Migration

CREATE INDEX idx_invoices_amount_date ON invoices(amount, invoice_date);

-- Down Migration

DROP INDEX idx_invoices_amount_date;