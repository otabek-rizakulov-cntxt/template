import { Users } from '@prisma/client';

/** A user as exposed to callers: never carries the password hash. */
export type PublicUser = Omit<Users, 'password'>;

/**
 * Drops the password hash from a user record.
 *
 * Having one named helper means the "never return the password" rule is applied
 * the same way everywhere, instead of being re-implemented as a destructuring
 * trick — with a lint suppression attached — at each call site.
 */
export function toPublicUser(user: Users): PublicUser {
  const { password: _password, ...publicFields } = user;
  return publicFields;
}
