import { ILogger } from '@domain/logger/logger.interface';
import { IException } from '@domain/exceptions/exceptions.interface';
import { TransactionRepositoryI } from '@domain/repositories/transaction-repository.interface';

export class DeleteTransactionUseCases {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionRepository: TransactionRepositoryI,
    private readonly exceptionService: IException,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.transactionRepository.deleteTransaction(
      id,
      userId,
    );

    if (!deleted) {
      this.exceptionService.NotFoundException({
        message: `Transaction ${id} was not found`,
        code_error: 404,
      });
    }

    this.logger.log(
      'DeleteTransactionUseCases execute',
      `Transaction ${id} has been deleted`,
    );
  }
}
