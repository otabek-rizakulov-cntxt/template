import { Transaction } from '@prisma/client';

import {
  CreateTransactionI,
  ListTransactionsOptions,
  TransactionRepositoryI,
  UpdateTransactionI,
} from '@domain/repositories/transaction-repository.interface';

/**
 * Map-backed stand-in for the transaction repository. It stores real records and
 * enforces the same owner scoping as the Prisma adapter, so tests can assert on
 * resulting state ("the row is still there") rather than on which methods were
 * called.
 */
export class InMemoryTransactionRepository implements TransactionRepositoryI {
  private readonly rows = new Map<string, Transaction>();
  private sequence = 0;

  seed(...transactions: Transaction[]): void {
    for (const transaction of transactions) {
      this.rows.set(transaction.id, transaction);
    }
  }

  size(): number {
    return this.rows.size;
  }

  private ownedBy(id: string, userId: string): Transaction | null {
    const row = this.rows.get(id);
    return row && row.userId === userId ? row : null;
  }

  getTransaction(id: string, userId: string): Promise<Transaction | null> {
    return Promise.resolve(this.ownedBy(id, userId));
  }

  createTransaction(data: CreateTransactionI): Promise<Transaction> {
    const created = {
      ...data,
      id: `t-${++this.sequence}`,
      date: new Date(0),
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as unknown as Transaction;
    this.rows.set(created.id, created);
    return Promise.resolve(created);
  }

  updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionI,
  ): Promise<Transaction | null> {
    const existing = this.ownedBy(id, userId);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated = { ...existing, ...data } as Transaction;
    this.rows.set(id, updated);
    return Promise.resolve(updated);
  }

  deleteTransaction(id: string, userId: string): Promise<boolean> {
    if (!this.ownedBy(id, userId)) {
      return Promise.resolve(false);
    }
    this.rows.delete(id);
    return Promise.resolve(true);
  }

  listTransactions(
    userId: string,
    options: ListTransactionsOptions,
  ): Promise<Transaction[]> {
    const owned = [...this.rows.values()].filter((r) => r.userId === userId);
    const start = (options.pageNumber - 1) * options.itemsPerPage;
    return Promise.resolve(owned.slice(start, start + options.itemsPerPage));
  }
}
