// Test database: DATABASE_URL must point at a throwaway database (sweety_test).
// Tables are truncated between test files by helpers below.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
