// Runs once before all test files: applies schema.sql to the test database so
// `createdb sweety_test && npm test` works without a separate migrate step.
// schema.sql uses IF NOT EXISTS, so running it on every test run is safe.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

module.exports = async () => {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@localhost:5432/sweety',
  });
  await client.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../src/schema.sql'), 'utf8');
    await client.query(sql);
  } finally {
    await client.end();
  }
};
