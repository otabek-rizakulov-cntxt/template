/**
 * Jest `setupFiles` entry: runs before any test module is imported.
 *
 * Config-reading providers need these present. Values are deliberately obvious
 * fakes — nothing here should ever reach a real service.
 */
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-access-secret-not-for-real-use-000',
  JWT_EXPIRATION_TIME: '3600',
  JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret-not-for-real-use-0',
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: '86400',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
