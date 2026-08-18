import { Transaction } from '@prisma/client';

import { ILogger } from '@domain/logger/logger.interface';
import { IException } from '@domain/exceptions/exceptions.interface';
import { TransactionRepositoryI } from '@domain/repositories/transaction-repository.interface';

export class GetTransactionByIdUseCases {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionRepository: TransactionRepositoryI,
    private readonly exceptionService: IException,
  ) {}

  async execute(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.getTransaction(
      id,
      userId,
    );

    if (!transaction) {
      // Deliberately NotFound rather than Forbidden: a transaction owned by
      // someone else must not be distinguishable from one that does not exist.
      this.exceptionService.NotFoundException({
        message: `Transaction ${id} was not found`,
        code_error: 404,
      });
    }

    this.logger.log(
      'GetTransactionByIdUseCases execute',
      `Transaction ${id} has been read`,
    );
    return transaction;
  }
}
