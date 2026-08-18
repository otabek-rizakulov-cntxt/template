import { Transaction } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@config/prisma/prisma.service';
import {
  CreateTransactionI,
  ListTransactionsOptions,
  TransactionRepositoryI,
  UpdateTransactionI,
} from '@domain/repositories/transaction-repository.interface';

/**
 * Prisma adapter for the transaction port.
 *
 * Ownership is expressed in the `where` clause of every statement, so a request
 * for someone else's transaction returns nothing instead of relying on a caller
 * to remember an authorization check.
 */
@Injectable()
export class DatabaseTransactionRepository implements TransactionRepositoryI {
  constructor(private readonly prisma: PrismaService) {}

  getTransaction(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { id, userId } });
  }

  createTransaction(data: CreateTransactionI): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  async updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionI,
  ): Promise<Transaction | null> {
    // updateMany takes a full where clause, so the owner check and the write are
    // a single statement — there is no read-then-write window to lose a race in.
    const { count } = await this.prisma.transaction.updateMany({
      where: { id, userId },
      data,
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.transaction.findFirst({ where: { id, userId } });
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.transaction.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  listTransactions(
    userId: string,
    options: ListTransactionsOptions,
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId },
      skip: (options.pageNumber - 1) * options.itemsPerPage,
      take: options.itemsPerPage,
      orderBy: { [options.orderBy]: options.orderDirection },
    });
  }
}
