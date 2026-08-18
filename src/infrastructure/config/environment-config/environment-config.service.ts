import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '@domain/config/app.interface';
import { JWTConfig } from '@domain/config/jwt.interface';
import { DatabaseConfig } from '@domain/config/database.interface';

/**
 * The single place the application reads configuration.
 *
 * Every getter fails loudly on a missing value rather than returning '' — an
 * empty JWT secret is a security hole, not a default. Boot-time validation
 * should catch these first; this is the backstop.
 */
@Injectable()
export class EnvironmentConfigService
  implements DatabaseConfig, JWTConfig, AppConfig
{
  constructor(private readonly configService: ConfigService) {}

  private required(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required configuration value: ${key}`);
    }
    return value;
  }

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') ?? 'development';
  }

  getAppHost(): string {
    return this.configService.get<string>('APP_HOST') ?? '0.0.0.0';
  }

  getAppPort(): number {
    return Number(this.configService.get<string>('APP_PORT') ?? 3000);
  }

  getCorsAllowedOrigins(): string[] {
    return (this.configService.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  getDatabaseUrl(): string {
    return this.required('DATABASE_URL');
  }

  getJwtSecret(): string {
    return this.required('JWT_SECRET');
  }

  getJwtExpirationTime(): string {
    return this.required('JWT_EXPIRATION_TIME');
  }

  getJwtRefreshSecret(): string {
    return this.required('JWT_REFRESH_TOKEN_SECRET');
  }

  getJwtRefreshExpirationTime(): string {
    return this.required('JWT_REFRESH_TOKEN_EXPIRATION_TIME');
  }
}
