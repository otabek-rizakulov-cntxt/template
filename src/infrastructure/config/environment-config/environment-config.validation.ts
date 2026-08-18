import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Local = 'local',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  // A short secret is a weak secret; 32 characters is the practical floor for
  // HS256. Enforcing it here means a bad value cannot reach production.
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsNumberString()
  @IsNotEmpty()
  JWT_EXPIRATION_TIME: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_TOKEN_SECRET: string;

  @IsNumberString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsOptional()
  @IsNumberString()
  APP_PORT?: string;

  @IsOptional()
  @IsString()
  APP_HOST?: string;

  @IsOptional()
  @IsString()
  CORS_ALLOWED_ORIGINS?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return validatedConfig;
}
