const pool = require('../../src/config/db');

// Wipes every table back to empty and resets the auto-increment counters,
// so each test starts from a clean, predictable database instead of
// depending on whatever an earlier test happened to leave behind.
async function resetDb() {
  await pool.query('TRUNCATE TABLE matches, payments, invoices, users RESTART IDENTITY CASCADE');
}

module.exports = resetDb;
