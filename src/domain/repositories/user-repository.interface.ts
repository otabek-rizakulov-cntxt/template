import { Users } from '@prisma/client';

export type RegisterUserI = Pick<Users, 'email' | 'password' | 'name'>;

/**
 * Intention-revealing port for user persistence.
 *
 * Deliberately narrow: it exposes the operations the business rules need and
 * nothing else. It does not extend the Prisma client surface, so a use case
 * cannot reach past these methods to issue an arbitrary query.
 */
export interface UserRepositoryI {
  getUserByEmail(email: string): Promise<Users | null>;
  updateLastLogin(email: string): Promise<void>;
  updateRefreshToken(email: string, hashedRefreshToken: string): Promise<void>;
  clearRefreshToken(email: string): Promise<void>;
  register(user: RegisterUserI): Promise<Users>;
}
