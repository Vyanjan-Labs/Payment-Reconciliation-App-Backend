const pool = require('../config/db');

// Runs fn with a single database client inside BEGIN/COMMIT. If fn throws,
// everything it did gets rolled back instead of leaving a half-finished
// change (e.g. a match created but the invoice never updated).
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = withTransaction;
