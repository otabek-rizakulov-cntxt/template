import { Transaction } from '@prisma/client';

export type CreateTransactionI = Pick<
  Transaction,
  'amount' | 'type' | 'status' | 'categoryId' | 'userId'
>;

export type UpdateTransactionI = Partial<
  Pick<Transaction, 'amount' | 'type' | 'status' | 'categoryId'>
>;

export const TRANSACTION_ORDER_FIELDS = [
  'date',
  'amount',
  'createdAt',
] as const;

export type TransactionOrderField = (typeof TRANSACTION_ORDER_FIELDS)[number];

export interface ListTransactionsOptions {
  pageNumber: number;
  itemsPerPage: number;
  orderBy: TransactionOrderField;
  orderDirection: 'asc' | 'desc';
}

/**
 * Intention-revealing port for transaction persistence.
 *
 * Deliberately narrow: it exposes the operations the business rules need and
 * nothing else, so a use case cannot reach past these methods to issue an
 * arbitrary query.
 *
 * Every method is scoped by `userId`. Ownership is enforced in the query rather
 * than by a separate check the caller might forget, so a transaction belonging
 * to another user is indistinguishable from one that does not exist.
 */
export interface TransactionRepositoryI {
  getTransaction(id: string, userId: string): Promise<Transaction | null>;
  createTransaction(data: CreateTransactionI): Promise<Transaction>;
  updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionI,
  ): Promise<Transaction | null>;
  deleteTransaction(id: string, userId: string): Promise<boolean>;
  listTransactions(
    userId: string,
    options: ListTransactionsOptions,
  ): Promise<Transaction[]>;
}
