import { Transaction } from '@prisma/client';

import { ILogger } from '@domain/logger/logger.interface';
import {
  ListTransactionsOptions,
  TransactionRepositoryI,
} from '@domain/repositories/transaction-repository.interface';

export class ListTransactionsUseCases {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionRepository: TransactionRepositoryI,
  ) {}

  async execute(
    userId: string,
    options: ListTransactionsOptions,
  ): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.listTransactions(
      userId,
      options,
    );
    this.logger.log(
      'ListTransactionsUseCases execute',
      `Listed ${transactions.length} transactions`,
    );
    return transactions;
  }
}
