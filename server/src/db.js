const pg = require('pg');
const { Pool } = pg;

// Return DATE columns as raw 'YYYY-MM-DD' strings. A reading's date is a
// calendar day, not an instant, so it must never shift with the server timezone.
pg.types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/sweety',
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
