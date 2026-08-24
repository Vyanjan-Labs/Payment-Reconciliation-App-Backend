const pool = require('../../config/db');

const COLUMNS = [
  'transaction_id',
  'payment_date',
  'amount',
  'reference_number',
  'payer_name',
  'description',
  'raw_row',
];

async function bulkInsert(rows) {
  if (rows.length === 0) {
    return [];
  }

  const values = [];
  const valueGroups = rows.map((row, i) => {
    const base = i * COLUMNS.length;
    COLUMNS.forEach((column) => values.push(row[column] ?? null));
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(', ')})`;
  });

  const result = await pool.query(
    `INSERT INTO payments (${COLUMNS.join(', ')})
     VALUES ${valueGroups.join(', ')}
     ON CONFLICT (transaction_id) DO NOTHING
     RETURNING transaction_id`,
    values
  );

  return result.rows.map((r) => r.transaction_id);
}

async function list({ limit = 50, page = 1 } = {}) {
  const safeLimit = Math.min(Number(limit) || 50, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const result = await pool.query(
    'SELECT * FROM payments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [safeLimit, offset]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = { bulkInsert, list, findById };
