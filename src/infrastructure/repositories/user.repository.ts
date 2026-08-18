import { Users } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@config/prisma/prisma.service';
import {
  RegisterUserI,
  UserRepositoryI,
} from '@domain/repositories/user-repository.interface';

/**
 * Prisma adapter for the user port.
 *
 * It implements only the operations the port declares — it no longer inherits a
 * generic passthrough of the Prisma client, so use cases cannot reach past this
 * surface, and every query here is written against an explicit model.
 */
@Injectable()
export class DatabaseUserRepository implements UserRepositoryI {
  constructor(private readonly prisma: PrismaService) {}

  getUserByEmail(email: string): Promise<Users | null> {
    return this.prisma.users.findFirst({ where: { email } });
  }

  async updateLastLogin(email: string): Promise<void> {
    await this.prisma.users.update({
      where: { email },
      data: { lastLogin: new Date() },
    });
  }

  async updateRefreshToken(
    email: string,
    hashedRefreshToken: string,
  ): Promise<void> {
    await this.prisma.users.update({
      where: { email },
      data: { hashRefreshToken: hashedRefreshToken },
    });
  }

  async clearRefreshToken(email: string): Promise<void> {
    await this.prisma.users.update({
      where: { email },
      data: { hashRefreshToken: null },
    });
  }

  register(user: RegisterUserI): Promise<Users> {
    // The password arrives already hashed; hashing is a rule owned by the
    // register use case, not by the persistence adapter.
    return this.prisma.users.create({ data: user });
  }
}
