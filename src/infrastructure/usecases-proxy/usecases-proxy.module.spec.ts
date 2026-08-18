import { Test } from '@nestjs/testing';

import { Symbols } from '@domain/symbols';

import { PrismaService } from '@config/prisma/prisma.service';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { DatabaseUserRepository } from '@infrastructure/repositories/user.repository';
import { DatabaseTransactionRepository } from '@infrastructure/repositories/transaction.repository';

import { AuthUseCasesProxyModule } from '@usecases/auth/auth-usecases-proxy.module';
import { UserUseCasesProxyModule } from '@usecases/user/user-usecase-proxy.module';
import { TransactionsUseCasesProxyModule } from '@usecases/transactions/transactions-usecases-proxy.module';
import { InMemoryUserRepository } from '@usecases/testing/in-memory-user-repository';
import { InMemoryTransactionRepository } from '@usecases/testing/in-memory-transaction-repository';

/**
 * Guards the hand-written provider factories.
 *
 * Nest resolves `inject` arrays at runtime, so a factory declaring more
 * parameters than its `inject` array supplies is not a compile error — the extra
 * collaborators simply arrive as `undefined` and blow up later, often only on an
 * error path. This suite resolves every registered use case and asserts that no
 * constructor-injected collaborator is missing.
 */
describe('use-case proxy wiring', () => {
  const requiredEnv = {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-access-secret',
    JWT_EXPIRATION_TIME: '3600',
    JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
    JWT_REFRESH_TOKEN_EXPIRATION_TIME: '86400',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
  };

  let resolved: Map<symbol, object>;

  beforeAll(async () => {
    Object.assign(process.env, requiredEnv);

    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthUseCasesProxyModule.register(),
        UserUseCasesProxyModule.register(),
        TransactionsUseCasesProxyModule.register(),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(DatabaseUserRepository)
      .useValue(new InMemoryUserRepository())
      .overrideProvider(DatabaseTransactionRepository)
      .useValue(new InMemoryTransactionRepository())
      .compile();

    resolved = new Map(
      Object.values(Symbols).map((token) => [
        token,
        moduleRef.get<UseCaseProxy<object>>(token).getInstance(),
      ]),
    );
  });

  it('registers every symbol in the registry', () => {
    expect(resolved.size).toBe(Object.values(Symbols).length);
  });

  it.each(Object.entries(Symbols))(
    '%s resolves to a use-case instance',
    (_name, token) => {
      expect(resolved.get(token)).toBeDefined();
    },
  );

  it.each(Object.entries(Symbols))(
    '%s has no undefined collaborator',
    (_name, token) => {
      const instance = resolved.get(token) as Record<string, unknown>;
      const missing = Object.entries(instance)
        .filter(([, value]) => value === undefined)
        .map(([key]) => key);

      expect(missing).toEqual([]);
    },
  );
});
