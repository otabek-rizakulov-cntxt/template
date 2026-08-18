import { Users } from '@prisma/client';

import {
  RegisterUserI,
  UserRepositoryI,
} from '@domain/repositories/user-repository.interface';

/**
 * Map-backed stand-in for the user repository. It stores real records so tests
 * can assert on resulting state rather than on which methods were called.
 */
export class InMemoryUserRepository implements UserRepositoryI {
  private readonly rows = new Map<string, Users>();
  private sequence = 0;

  seed(...users: Users[]): void {
    for (const user of users) {
      this.rows.set(user.email, user);
    }
  }

  /** Builds a persisted user with an already-hashed password. */
  seedUser(
    overrides: Partial<Users> & Pick<Users, 'email' | 'password'>,
  ): Users {
    const user: Users = {
      id: `u-${++this.sequence}`,
      name: 'Test User',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      lastLogin: null,
      hashRefreshToken: null,
      ...overrides,
    } as Users;
    this.rows.set(user.email, user);
    return user;
  }

  getUserByEmail(email: string): Promise<Users | null> {
    return Promise.resolve(this.rows.get(email) ?? null);
  }

  updateLastLogin(email: string): Promise<void> {
    const user = this.rows.get(email);
    if (user) {
      this.rows.set(email, { ...user, lastLogin: new Date() });
    }
    return Promise.resolve();
  }

  updateRefreshToken(email: string, hashedRefreshToken: string): Promise<void> {
    const user = this.rows.get(email);
    if (user) {
      this.rows.set(email, { ...user, hashRefreshToken: hashedRefreshToken });
    }
    return Promise.resolve();
  }

  clearRefreshToken(email: string): Promise<void> {
    const user = this.rows.get(email);
    if (user) {
      this.rows.set(email, { ...user, hashRefreshToken: null });
    }
    return Promise.resolve();
  }

  register(user: RegisterUserI): Promise<Users> {
    return Promise.resolve(this.seedUser(user));
  }
}
