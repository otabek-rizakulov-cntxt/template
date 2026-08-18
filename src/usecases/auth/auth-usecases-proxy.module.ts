import { DynamicModule, Module } from '@nestjs/common';

import { Symbols } from '@domain/symbols';

import { EnvironmentConfigModule } from '@config/environment-config/environment-config.module';
import { EnvironmentConfigService } from '@config/environment-config/environment-config.service';

import { JwtModule } from '@infrastructure/services/jwt/jwt.module';
import { LoggerModule } from '@infrastructure/logger/logger.module';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { JwtTokenService } from '@infrastructure/services/jwt/jwt.service';
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { BcryptService } from '@infrastructure/services/bcrypt/bcrypt.service';
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module';
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service';
import { RepositoriesModule } from '@infrastructure/repositories/repositories.module';
import { DatabaseUserRepository } from '@infrastructure/repositories/user.repository';

import { LoginUseCases } from '@usecases/auth/login.usecases';
import { LogoutUseCases } from '@usecases/auth/logout.usecases';
import { RegisterUseCases } from '@usecases/auth/register.usecases';
import { IsAuthenticatedUseCases } from '@usecases/auth/is-authenticated.usecases';

@Module({
  imports: [
    LoggerModule,
    JwtModule,
    BcryptModule,
    ExceptionsModule,
    EnvironmentConfigModule,
    RepositoriesModule,
  ],
})
export class AuthUseCasesProxyModule {
  static register(): DynamicModule {
    return {
      module: AuthUseCasesProxyModule,
      providers: [
        {
          provide: Symbols.LOGIN_USECASES_PROXY,
          inject: [
            LoggerService,
            JwtTokenService,
            EnvironmentConfigService,
            DatabaseUserRepository,
            BcryptService,
          ],
          useFactory: (
            logger: LoggerService,
            jwt: JwtTokenService,
            config: EnvironmentConfigService,
            userRepo: DatabaseUserRepository,
            bcrypt: BcryptService,
          ) =>
            new UseCaseProxy(
              new LoginUseCases(logger, jwt, config, userRepo, bcrypt),
            ),
        },
        {
          provide: Symbols.LOGOUT_USECASES_PROXY,
          inject: [DatabaseUserRepository],
          useFactory: (userRepo: DatabaseUserRepository) =>
            new UseCaseProxy(new LogoutUseCases(userRepo)),
        },
        {
          provide: Symbols.REGISTER_USECASES_PROXY,
          inject: [DatabaseUserRepository, ExceptionsService, BcryptService],
          useFactory: (
            userRepo: DatabaseUserRepository,
            exceptions: ExceptionsService,
            bcrypt: BcryptService,
          ) =>
            new UseCaseProxy(
              new RegisterUseCases(userRepo, exceptions, bcrypt),
            ),
        },
        {
          provide: Symbols.IS_AUTHENTICATED_USECASES_PROXY,
          inject: [DatabaseUserRepository],
          useFactory: (userRepo: DatabaseUserRepository) =>
            new UseCaseProxy(new IsAuthenticatedUseCases(userRepo)),
        },
      ],
      exports: [
        Symbols.LOGIN_USECASES_PROXY,
        Symbols.LOGOUT_USECASES_PROXY,
        Symbols.REGISTER_USECASES_PROXY,
        Symbols.IS_AUTHENTICATED_USECASES_PROXY,
      ],
    };
  }
}
