import { Users } from '@prisma/client';

import { PrismaService } from '@config/prisma/prisma.service';
import { DatabaseUserRepository } from '@infrastructure/repositories/user.repository';

interface RecordedCall {
  model: string;
  method: string;
  args: unknown;
}

/**
 * Records the Prisma calls a repository makes. This is the boundary we cannot
 * exercise without a live database, so the adapter is verified by asserting it
 * addresses the right model with the right arguments.
 */
class RecordingPrisma {
  readonly calls: RecordedCall[] = [];

  private model(name: string) {
    const record = (method: string) => (args: unknown) => {
      this.calls.push({ model: name, method, args });
      return Promise.resolve({ id: 'u-1', email: 'a@b.c' } as Users);
    };
    return {
      findFirst: record('findFirst'),
      findUnique: record('findUnique'),
      create: record('create'),
      update: record('update'),
      delete: record('delete'),
      findMany: record('findMany'),
    };
  }

  users = this.model('users');
  transaction = this.model('transaction');

  asPrismaService(): PrismaService {
    return this as unknown as PrismaService;
  }

  only(method: string): RecordedCall[] {
    return this.calls.filter((c) => c.method === method);
  }
}

describe('DatabaseUserRepository', () => {
  let prisma: RecordingPrisma;
  let repository: DatabaseUserRepository;

  beforeEach(() => {
    prisma = new RecordingPrisma();
    repository = new DatabaseUserRepository(prisma.asPrismaService());
  });

  it('records the login time against the users model', async () => {
    await repository.updateLastLogin('a@b.c');

    expect(prisma.only('update')).toHaveLength(1);
    expect(prisma.only('update')[0].model).toBe('users');
  });

  it('sets lastLogin to a date when recording a login', async () => {
    await repository.updateLastLogin('a@b.c');

    const args = prisma.only('update')[0].args as {
      where: { email: string };
      data: { lastLogin: Date };
    };
    expect(args.where.email).toBe('a@b.c');
    expect(args.data.lastLogin).toBeInstanceOf(Date);
  });

  it('looks users up by email on the users model', async () => {
    await repository.getUserByEmail('a@b.c');

    const call = prisma.calls[0];
    expect(call.model).toBe('users');
    expect(call.args).toEqual({ where: { email: 'a@b.c' } });
  });

  it('clears the stored refresh token', async () => {
    await repository.clearRefreshToken('a@b.c');

    const args = prisma.only('update')[0].args as {
      data: { hashRefreshToken: string | null };
    };
    expect(args.data.hashRefreshToken).toBeNull();
  });

  it('stores the already-hashed password it is given', async () => {
    await repository.register({
      email: 'a@b.c',
      name: 'A',
      password: 'pre-hashed-value',
    });

    const args = prisma.only('create')[0].args as {
      data: { password: string };
    };
    expect(args.data.password).toBe('pre-hashed-value');
  });
});
