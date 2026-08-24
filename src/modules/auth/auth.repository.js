const pool = require('../../config/db');

async function createUser({ firstName, lastName, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, first_name, last_name, email, created_at`,
    [firstName, lastName, email, passwordHash]
  );
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { createUser, findByEmail, findById };
