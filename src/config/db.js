const { Pool, types } = require('pg');
const env = require('./env');

// Postgres DATE has no time or timezone. Without this, node-postgres turns it
// into a JS Date at local midnight, which then gets shifted a day off when
// serialized to JSON in UTC. Keeping it as a plain 'YYYY-MM-DD' string avoids
// that entirely.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({ connectionString: env.databaseUrl });

module.exports = pool;
