const pool = require('../../config/db');

const FUZZY_DATE_WINDOW_DAYS = 7;

async function getUnmatchedPayments() {
  const result = await pool.query(
    `SELECT * FROM payments WHERE status IN ('unmatched', 'partially_matched') ORDER BY id`
  );
  return result.rows;
}

async function findInvoiceByReferenceNumber(referenceNumber) {
  if (!referenceNumber) return null;
  const result = await pool.query(
    `SELECT * FROM invoices WHERE LOWER(TRIM(invoice_number)) = LOWER(TRIM($1))`,
    [referenceNumber]
  );
  return result.rows[0] || null;
}

// amount >= paymentAmount is a safe, loose pre-filter (an invoice's
// outstanding balance can never exceed its full amount), narrowed further
// by an exact date match in the JS engine.
async function findFuzzyCandidates(paymentAmount, paymentDate) {
  const result = await pool.query(
    `SELECT * FROM invoices
     WHERE status IN ('unmatched', 'partially_matched')
       AND amount >= $1
       AND invoice_date BETWEEN $2::date - $3 * INTERVAL '1 day'
                            AND $2::date + $3 * INTERVAL '1 day'`,
    [paymentAmount, paymentDate, FUZZY_DATE_WINDOW_DAYS]
  );
  return result.rows;
}

async function applyConfirmedAmount(client, { invoiceId, paymentId, matchedAmount }) {
  await client.query(
    `UPDATE invoices
     SET amount_matched = amount_matched + $2,
         status = CASE
           WHEN amount_matched + $2 > amount THEN 'overpaid'
           WHEN amount_matched + $2 = amount THEN 'matched'
           ELSE 'partially_matched'
         END,
         updated_at = now()
     WHERE id = $1`,
    [invoiceId, matchedAmount]
  );

  await client.query(
    `UPDATE payments
     SET amount_matched = amount_matched + $2,
         status = CASE WHEN amount_matched + $2 >= amount THEN 'matched' ELSE 'partially_matched' END,
         updated_at = now()
     WHERE id = $1`,
    [paymentId, matchedAmount]
  );
}

// The reverse of applyConfirmedAmount - used when undoing a confirmed match.
async function revertAppliedAmount(client, { invoiceId, paymentId, matchedAmount }) {
  await client.query(
    `UPDATE invoices
     SET amount_matched = GREATEST(amount_matched - $2, 0),
         status = CASE
           WHEN GREATEST(amount_matched - $2, 0) = 0 THEN 'unmatched'
           WHEN GREATEST(amount_matched - $2, 0) >= amount THEN 'matched'
           ELSE 'partially_matched'
         END,
         updated_at = now()
     WHERE id = $1`,
    [invoiceId, matchedAmount]
  );

  await client.query(
    `UPDATE payments
     SET amount_matched = GREATEST(amount_matched - $2, 0),
         status = CASE
           WHEN GREATEST(amount_matched - $2, 0) = 0 THEN 'unmatched'
           WHEN GREATEST(amount_matched - $2, 0) >= amount THEN 'matched'
           ELSE 'partially_matched'
         END,
         updated_at = now()
     WHERE id = $1`,
    [paymentId, matchedAmount]
  );
}

async function updateMatchStatus(client, id, { status, notes }) {
  const result = await client.query(
    `UPDATE matches SET status = $2, notes = $3, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status, notes ?? null]
  );
  return result.rows[0];
}

async function deleteMatchRow(client, id) {
  await client.query('DELETE FROM matches WHERE id = $1', [id]);
}

async function findMatchByPair(invoiceId, paymentId) {
  const result = await pool.query(
    'SELECT * FROM matches WHERE invoice_id = $1 AND payment_id = $2',
    [invoiceId, paymentId]
  );
  return result.rows[0] || null;
}

// Turns a previously-rejected match into a confirmed manual one, instead of
// inserting a second row for the same pair (which the UNIQUE constraint
// would refuse regardless of the old row's status).
async function overwriteAsManualMatch(client, id, { matchedAmount, notes }) {
  const result = await client.query(
    `UPDATE matches
     SET match_type = 'manual', status = 'confirmed', matched_amount = $2,
         matched_by = 'manual', match_score = NULL, notes = $3, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, matchedAmount, notes ?? null]
  );
  return result.rows[0];
}

// Creates the match row and, only when it's confirmed, applies the money to
// both sides. A needs_review match is recorded but doesn't touch running
// totals until a person confirms it later.
async function recordMatch(client, { paymentId, invoiceId, matchType, status, matchedAmount, score, matchedBy = 'system', notes }) {
  const matchResult = await client.query(
    `INSERT INTO matches (invoice_id, payment_id, match_type, match_score, matched_amount, status, matched_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [invoiceId, paymentId, matchType, score, matchedAmount, status, matchedBy, notes ?? null]
  );

  if (status === 'confirmed') {
    await applyConfirmedAmount(client, { invoiceId, paymentId, matchedAmount });
  }

  return matchResult.rows[0];
}

async function listMatches(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.matchType) {
    values.push(filters.matchType);
    conditions.push(`match_type = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM matches ${whereClause} ORDER BY created_at DESC`,
    values
  );
  return result.rows;
}

async function findMatchById(id) {
  const result = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = {
  getUnmatchedPayments,
  findInvoiceByReferenceNumber,
  findFuzzyCandidates,
  applyConfirmedAmount,
  revertAppliedAmount,
  recordMatch,
  updateMatchStatus,
  deleteMatchRow,
  findMatchByPair,
  overwriteAsManualMatch,
  listMatches,
  findMatchById,
};
