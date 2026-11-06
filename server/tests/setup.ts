// Runs before every test file: give config.ts safe fake values so no real
// secrets or database are needed for unit tests.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.ANTHROPIC_API_KEY = "";
