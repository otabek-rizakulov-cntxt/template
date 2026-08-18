import { ConfigService } from '@nestjs/config';

import { EnvironmentConfigService } from './environment-config.service';

const configFrom = (values: Record<string, string>) =>
  new EnvironmentConfigService({
    get: (key: string) => values[key],
  } as unknown as ConfigService);

describe('EnvironmentConfigService', () => {
  const complete = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
    JWT_EXPIRATION_TIME: '3600',
    JWT_REFRESH_TOKEN_SECRET: 'b'.repeat(32),
    JWT_REFRESH_TOKEN_EXPIRATION_TIME: '86400',
  };

  it('returns configured values', () => {
    const config = configFrom(complete);

    expect(config.getJwtSecret()).toBe('a'.repeat(32));
    expect(config.getDatabaseUrl()).toBe(complete.DATABASE_URL);
  });

  // Previously every getter returned '' when the value was absent, so an empty
  // JWT signing secret was indistinguishable from a configured one.
  it('throws rather than returning an empty secret', () => {
    const config = configFrom({ ...complete, JWT_SECRET: '' });

    expect(() => config.getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('throws rather than returning an empty database url', () => {
    const config = configFrom({ ...complete, DATABASE_URL: '' });

    expect(() => config.getDatabaseUrl()).toThrow(/DATABASE_URL/);
  });

  it('defaults the port when APP_PORT is unset', () => {
    expect(configFrom(complete).getAppPort()).toBe(3000);
  });

  it('reads the port as a number when set', () => {
    expect(configFrom({ ...complete, APP_PORT: '8080' }).getAppPort()).toBe(
      8080,
    );
  });

  it('parses a comma-separated CORS allowlist', () => {
    const config = configFrom({
      ...complete,
      CORS_ALLOWED_ORIGINS: 'https://a.example , https://b.example',
    });

    expect(config.getCorsAllowedOrigins()).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('yields an empty allowlist when no origins are configured', () => {
    expect(configFrom(complete).getCorsAllowedOrigins()).toEqual([]);
  });
});
