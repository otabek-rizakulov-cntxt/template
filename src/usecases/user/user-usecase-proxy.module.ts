import { DynamicModule, Module } from '@nestjs/common';

import { GetUserByEmail } from '@usecases/user/get-user-by-email.usecase';

import { Symbols } from '@domain/symbols';

import { LoggerModule } from '@infrastructure/logger/logger.module';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { RepositoriesModule } from '@infrastructure/repositories/repositories.module';
import { DatabaseUserRepository } from '@infrastructure/repositories/user.repository';

@Module({
  imports: [LoggerModule, RepositoriesModule],
})
export class UserUseCasesProxyModule {
  static register(): DynamicModule {
    return {
      module: UserUseCasesProxyModule,
      providers: [
        {
          provide: Symbols.GET_USER_BY_EMAIL_USECASES_PROXY,
          inject: [LoggerService, DatabaseUserRepository],
          useFactory: (logger: LoggerService, repo: DatabaseUserRepository) =>
            new UseCaseProxy(new GetUserByEmail(logger, repo)),
        },
      ],
      exports: [Symbols.GET_USER_BY_EMAIL_USECASES_PROXY],
    };
  }
}
