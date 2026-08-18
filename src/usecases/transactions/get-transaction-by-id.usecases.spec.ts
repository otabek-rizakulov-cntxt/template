import { NotFoundException } from '@nestjs/common';
import { Transaction } from '@prisma/client';

import { GetTransactionByIdUseCases } from './get-transaction-by-id.usecases';
import { FakeExceptions } from '@usecases/testing/fake-exceptions';
import { FakeLogger } from '@usecases/testing/fake-logger';
import { InMemoryTransactionRepository } from '@usecases/testing/in-memory-transaction-repository';

const USER = 'u-1';

const aTransaction = (id: string): Transaction =>
  ({
    id,
    userId: USER,
    amount: 100,
    type: 'income',
    status: 'active',
    categoryId: 'cat-1',
    date: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }) as unknown as Transaction;

describe('GetTransactionByIdUseCases', () => {
  let repository: InMemoryTransactionRepository;
  let useCase: GetTransactionByIdUseCases;

  beforeEach(() => {
    repository = new InMemoryTransactionRepository();
    useCase = new GetTransactionByIdUseCases(
      new FakeLogger(),
      repository,
      new FakeExceptions(),
    );
  });

  it('returns the requested transaction', async () => {
    const transaction = aTransaction('t-1');
    repository.seed(transaction);

    await expect(useCase.execute('t-1', USER)).resolves.toEqual(transaction);
  });

  // Regression test: this use case used to call deleteTransaction, so reading a
  // transaction destroyed it and returned null.
  it('leaves the transaction in the repository after reading it', async () => {
    repository.seed(aTransaction('t-1'));

    await useCase.execute('t-1', USER);

    await expect(
      repository.getTransaction('t-1', USER),
    ).resolves.not.toBeNull();
  });

  it('does not report the read as a deletion', async () => {
    repository.seed(aTransaction('t-1'));

    await useCase.execute('t-1', USER);

    expect(repository.size()).toBe(1);
  });

  it('throws NotFound when the transaction does not exist', async () => {
    await expect(useCase.execute('missing', USER)).rejects.toThrow(
      NotFoundException,
    );
  });
});
