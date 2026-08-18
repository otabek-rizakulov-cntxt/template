import { NotFoundException } from '@nestjs/common';
import { Transaction } from '@prisma/client';

import { FakeExceptions } from '@usecases/testing/fake-exceptions';
import { FakeLogger } from '@usecases/testing/fake-logger';
import { InMemoryTransactionRepository } from '@usecases/testing/in-memory-transaction-repository';
import { DeleteTransactionUseCases } from '@usecases/transactions/delete-transaction.usecases';
import { GetTransactionByIdUseCases } from '@usecases/transactions/get-transaction-by-id.usecases';
import { UpdateTransactionUseCases } from '@usecases/transactions/update-transaction.usecases';

const OWNER = 'u-owner';
const INTRUDER = 'u-intruder';

const aTransaction = (id: string, userId: string): Transaction =>
  ({
    id,
    userId,
    amount: 100,
    type: 'income',
    status: 'active',
    categoryId: 'cat-1',
    date: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }) as unknown as Transaction;

describe('transaction ownership', () => {
  let repository: InMemoryTransactionRepository;
  let read: GetTransactionByIdUseCases;
  let update: UpdateTransactionUseCases;
  let remove: DeleteTransactionUseCases;

  beforeEach(() => {
    repository = new InMemoryTransactionRepository();
    repository.seed(aTransaction('t-1', OWNER));

    const logger = new FakeLogger();
    const exceptions = new FakeExceptions();
    read = new GetTransactionByIdUseCases(logger, repository, exceptions);
    update = new UpdateTransactionUseCases(logger, repository, exceptions);
    remove = new DeleteTransactionUseCases(logger, repository, exceptions);
  });

  it('lets the owner read their transaction', async () => {
    await expect(read.execute('t-1', OWNER)).resolves.toMatchObject({
      id: 't-1',
    });
  });

  it('hides another user’s transaction on read', async () => {
    await expect(read.execute('t-1', INTRUDER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuses to update another user’s transaction', async () => {
    await expect(
      update.execute('t-1', INTRUDER, { amount: 999 as never }),
    ).rejects.toThrow(NotFoundException);
  });

  it('leaves the record untouched after a refused update', async () => {
    await update
      .execute('t-1', INTRUDER, { amount: 999 as never })
      .catch(() => {
        /* expected */
      });

    const stored = await repository.getTransaction('t-1', OWNER);
    expect(stored?.amount).toBe(100);
  });

  it('refuses to delete another user’s transaction', async () => {
    await expect(remove.execute('t-1', INTRUDER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('leaves the record in place after a refused delete', async () => {
    await remove.execute('t-1', INTRUDER).catch(() => {
      /* expected */
    });

    await expect(
      repository.getTransaction('t-1', OWNER),
    ).resolves.not.toBeNull();
  });

  it('lets the owner delete their own transaction', async () => {
    await remove.execute('t-1', OWNER);

    await expect(repository.getTransaction('t-1', OWNER)).resolves.toBeNull();
  });
});
