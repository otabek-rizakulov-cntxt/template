import { DynamicModule, Module } from '@nestjs/common';

import { Symbols } from '@domain/symbols';

import { LoggerModule } from '@infrastructure/logger/logger.module';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module';
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service';
import { RepositoriesModule } from '@infrastructure/repositories/repositories.module';
import { DatabaseTransactionRepository } from '@infrastructure/repositories/transaction.repository';

import { CreateTransactionUsecase } from '@usecases/transactions/create-transaction.usecases';
import { DeleteTransactionUseCases } from '@usecases/transactions/delete-transaction.usecases';
import { GetTransactionByIdUseCases } from '@usecases/transactions/get-transaction-by-id.usecases';
import { ListTransactionsUseCases } from '@usecases/transactions/list-transactions.usecases';
import { UpdateTransactionUseCases } from '@usecases/transactions/update-transaction.usecases';

@Module({
  imports: [LoggerModule, ExceptionsModule, RepositoriesModule],
})
export class TransactionsUseCasesProxyModule {
  static register(): DynamicModule {
    return {
      module: TransactionsUseCasesProxyModule,
      providers: [
        {
          provide: Symbols.CREATE_TRANSACTION_USECASES_PROXY,
          inject: [LoggerService, DatabaseTransactionRepository],
          useFactory: (
            logger: LoggerService,
            repo: DatabaseTransactionRepository,
          ) => new UseCaseProxy(new CreateTransactionUsecase(logger, repo)),
        },
        {
          provide: Symbols.READ_TRANSACTION_USECASES_PROXY,
          inject: [
            LoggerService,
            DatabaseTransactionRepository,
            ExceptionsService,
          ],
          useFactory: (
            logger: LoggerService,
            repo: DatabaseTransactionRepository,
            exceptions: ExceptionsService,
          ) =>
            new UseCaseProxy(
              new GetTransactionByIdUseCases(logger, repo, exceptions),
            ),
        },
        {
          provide: Symbols.LIST_TRANSACTIONS_USECASES_PROXY,
          inject: [LoggerService, DatabaseTransactionRepository],
          useFactory: (
            logger: LoggerService,
            repo: DatabaseTransactionRepository,
          ) => new UseCaseProxy(new ListTransactionsUseCases(logger, repo)),
        },
        {
          provide: Symbols.UPDATE_TRANSACTION_USECASES_PROXY,
          inject: [
            LoggerService,
            DatabaseTransactionRepository,
            ExceptionsService,
          ],
          useFactory: (
            logger: LoggerService,
            repo: DatabaseTransactionRepository,
            exceptions: ExceptionsService,
          ) =>
            new UseCaseProxy(
              new UpdateTransactionUseCases(logger, repo, exceptions),
            ),
        },
        {
          provide: Symbols.DELETE_TRANSACTION_USECASES_PROXY,
          inject: [
            LoggerService,
            DatabaseTransactionRepository,
            ExceptionsService,
          ],
          useFactory: (
            logger: LoggerService,
            repo: DatabaseTransactionRepository,
            exceptions: ExceptionsService,
          ) =>
            new UseCaseProxy(
              new DeleteTransactionUseCases(logger, repo, exceptions),
            ),
        },
      ],
      exports: [
        Symbols.CREATE_TRANSACTION_USECASES_PROXY,
        Symbols.READ_TRANSACTION_USECASES_PROXY,
        Symbols.LIST_TRANSACTIONS_USECASES_PROXY,
        Symbols.UPDATE_TRANSACTION_USECASES_PROXY,
        Symbols.DELETE_TRANSACTION_USECASES_PROXY,
      ],
    };
  }
}
