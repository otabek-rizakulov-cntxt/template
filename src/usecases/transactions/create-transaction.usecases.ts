import { Transaction } from '@prisma/client';

import { ILogger } from '@domain/logger/logger.interface';
import {
  CreateTransactionI,
  TransactionRepositoryI,
} from '@domain/repositories/transaction-repository.interface';

export class CreateTransactionUsecase {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionRepository: TransactionRepositoryI,
  ) {}

  async execute(data: CreateTransactionI): Promise<Transaction> {
    const created = await this.transactionRepository.createTransaction(data);
    this.logger.log(
      'CreateTransactionUseCases execute',
      `Transaction ${created.id} has been created`,
    );
    return created;
  }
}
