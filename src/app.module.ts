import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import configuration from '@infrastructure/config';
import { validate } from '@config/environment-config/environment-config.validation';
import { EnvironmentConfigModule } from '@config/environment-config/environment-config.module';

import { LoggerModule } from '@infrastructure/logger/logger.module';
import { JwtStrategy } from '@infrastructure/common/strategies/jwt.strategy';
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module';
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module';
import { LocalStrategy } from '@infrastructure/common/strategies/local.strategy';
import { ControllersModule } from '@infrastructure/controllers/controllers.module';
import { JwtModule as JwtServiceModule } from '@infrastructure/services/jwt/jwt.module';
import { JwtRefreshTokenStrategy } from '@infrastructure/common/strategies/jwtRefresh.strategy';

import { AuthUseCasesProxyModule } from '@usecases/auth/auth-usecases-proxy.module';
import { UserUseCasesProxyModule } from '@usecases/user/user-usecase-proxy.module';

@Module({
  imports: [
    // The single ConfigModule.forRoot in the application: it loads .env and runs
    // schema validation exactly once, at boot.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate,
    }),
    // Rate limiting: 10 requests per minute per IP by default. Applied globally
    // via APP_GUARD below so a new route is protected without opting in.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    PassportModule,
    LoggerModule,
    ExceptionsModule,
    EnvironmentConfigModule,
    BcryptModule,
    JwtServiceModule,
    AuthUseCasesProxyModule.register(),
    UserUseCasesProxyModule.register(),
    ControllersModule,
  ],
  providers: [
    LocalStrategy,
    JwtStrategy,
    JwtRefreshTokenStrategy,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
