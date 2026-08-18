/**
 * Namespaced view of the environment, loaded once by ConfigModule.forRoot.
 *
 * Read configuration through EnvironmentConfigService rather than from here or
 * from process.env directly — that adapter is the one place that validates and
 * defaults values.
 */
export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    host: process.env.APP_HOST ?? '0.0.0.0',
    port: Number(process.env.APP_PORT ?? 3000),
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS ?? '',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
});

export const ValidatorConfig = {
  transform: true,
  stopAtFirstError: true,
  whitelist: true,
  forbidNonWhitelisted: true,
};
