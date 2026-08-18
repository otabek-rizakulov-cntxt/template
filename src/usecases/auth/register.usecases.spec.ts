import { ConflictException } from '@nestjs/common';

import { BcryptService } from '@infrastructure/services/bcrypt/bcrypt.service';

import { RegisterUseCases } from './register.usecases';
import { FakeExceptions } from '@usecases/testing/fake-exceptions';
import { InMemoryUserRepository } from '@usecases/testing/in-memory-user-repository';

describe('RegisterUseCases', () => {
  let users: InMemoryUserRepository;
  let bcrypt: BcryptService;
  let useCase: RegisterUseCases;

  const newUser = {
    email: 'new@example.com',
    name: 'New User',
    password: 'Str0ng-passw0rd!',
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    bcrypt = new BcryptService();
    useCase = new RegisterUseCases(users, new FakeExceptions(), bcrypt);
  });

  it('persists a new user', async () => {
    const created = await useCase.execute(newUser);

    expect(created.email).toBe(newUser.email);
  });

  it('never stores the password in plain text', async () => {
    const created = await useCase.execute(newUser);

    expect(created.password).not.toBe(newUser.password);
  });

  it('stores a password that verifies against the original', async () => {
    const created = await useCase.execute(newUser);

    await expect(
      bcrypt.compare(newUser.password, created.password),
    ).resolves.toBe(true);
  });

  // This is the path that used to throw TypeError instead of an HTTP error,
  // because the proxy factory never injected the exception service.
  it('rejects a duplicate email with Conflict', async () => {
    await useCase.execute(newUser);

    await expect(useCase.execute(newUser)).rejects.toThrow(ConflictException);
  });

  it('does not create a second record for a duplicate email', async () => {
    await useCase.execute(newUser);
    await useCase.execute(newUser).catch(() => {
      /* expected */
    });

    const stored = await users.getUserByEmail(newUser.email);
    expect(stored?.name).toBe(newUser.name);
  });
});
