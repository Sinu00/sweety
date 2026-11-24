// Vercel serverless entry point: reuses the same Express app that runs
// locally (server/src/index.js). Vercel Postgres exposes POSTGRES_URL;
// local dev uses DATABASE_URL from server/.env.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

const app = require('../server/src/app');

module.exports = app;
