import { Transaction } from '@prisma/client';

import { ILogger } from '@domain/logger/logger.interface';
import { IException } from '@domain/exceptions/exceptions.interface';
import {
  TransactionRepositoryI,
  UpdateTransactionI,
} from '@domain/repositories/transaction-repository.interface';

export class UpdateTransactionUseCases {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionRepository: TransactionRepositoryI,
    private readonly exceptionService: IException,
  ) {}

  async execute(
    id: string,
    userId: string,
    data: UpdateTransactionI,
  ): Promise<Transaction> {
    const updated = await this.transactionRepository.updateTransaction(
      id,
      userId,
      data,
    );

    if (!updated) {
      this.exceptionService.NotFoundException({
        message: `Transaction ${id} was not found`,
        code_error: 404,
      });
    }

    this.logger.log(
      'UpdateTransactionUseCases execute',
      `Transaction ${id} has been updated`,
    );
    return updated;
  }
}
