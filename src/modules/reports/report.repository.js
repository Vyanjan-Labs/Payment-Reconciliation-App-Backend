const pool = require('../../config/db');

async function getInvoiceCounts() {
  const result = await pool.query('SELECT status, COUNT(*) AS count FROM invoices GROUP BY status');
  return result.rows;
}

async function getInvoiceAmountTotals() {
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_invoiced,
       COALESCE(SUM(amount_matched), 0) AS total_collected,
       COALESCE(SUM(amount - amount_matched), 0) AS total_outstanding
     FROM invoices`
  );
  return result.rows[0];
}

async function getMatchCounts() {
  const result = await pool.query('SELECT status, COUNT(*) AS count FROM matches GROUP BY status');
  return result.rows;
}

module.exports = { getInvoiceCounts, getInvoiceAmountTotals, getMatchCounts };
