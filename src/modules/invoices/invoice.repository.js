const pool = require('../../config/db');

async function create({ invoiceNumber, customerName, amount, invoiceDate, dueDate }) {
  const result = await pool.query(
    `INSERT INTO invoices (invoice_number, customer_name, amount, invoice_date, due_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [invoiceNumber, customerName, amount, invoiceDate, dueDate ?? null]
  );
  return result.rows[0];
}

const UPLOAD_COLUMNS = ['invoice_number', 'customer_name', 'amount', 'invoice_date', 'due_date'];

// Rows here are snake_case, straight from the CSV/Excel template - same
// approach as payment.repository.js's bulkInsert.
async function bulkInsert(rows) {
  if (rows.length === 0) {
    return [];
  }

  const values = [];
  const valueGroups = rows.map((row, i) => {
    const base = i * UPLOAD_COLUMNS.length;
    UPLOAD_COLUMNS.forEach((column) => values.push(row[column] ?? null));
    return `(${UPLOAD_COLUMNS.map((_, j) => `$${base + j + 1}`).join(', ')})`;
  });

  const result = await pool.query(
    `INSERT INTO invoices (${UPLOAD_COLUMNS.join(', ')})
     VALUES ${valueGroups.join(', ')}
     ON CONFLICT (invoice_number) DO NOTHING
     RETURNING invoice_number`,
    values
  );

  return result.rows.map((r) => r.invoice_number);
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function list(filters) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.invoiceNumber) {
    values.push(`%${filters.invoiceNumber}%`);
    conditions.push(`invoice_number ILIKE $${values.length}`);
  }
  if (filters.customerName) {
    values.push(`%${filters.customerName}%`);
    conditions.push(`customer_name ILIKE $${values.length}`);
  }
  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`invoice_date >= $${values.length}`);
  }
  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`invoice_date <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const limit = Math.min(Number(filters.limit) || 50, 100);
  const page = Math.max(Number(filters.page) || 1, 1);
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT * FROM invoices ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
}

async function update(id, fields) {
  const columnMap = {
    invoiceNumber: 'invoice_number',
    customerName: 'customer_name',
    amount: 'amount',
    invoiceDate: 'invoice_date',
    dueDate: 'due_date',
  };
  const setClauses = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      setClauses.push(`${column} = $${values.length}`);
    }
  }

  setClauses.push('updated_at = now()');
  values.push(id);

  const result = await pool.query(
    `UPDATE invoices SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function hasConfirmedMatches(id) {
  const result = await pool.query(
    `SELECT 1 FROM matches WHERE invoice_id = $1 AND status = 'confirmed' LIMIT 1`,
    [id]
  );
  return result.rows.length > 0;
}

async function remove(id) {
  await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
}

module.exports = { create, bulkInsert, findById, list, update, hasConfirmedMatches, remove };
