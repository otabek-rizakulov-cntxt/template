import { Module } from '@nestjs/common';

import { PrismaModule } from '@config/prisma/prisma.module';
import { DatabaseUserRepository } from '@infrastructure/repositories/user.repository';
import { DatabaseTransactionRepository } from '@infrastructure/repositories/transaction.repository';

@Module({
  imports: [PrismaModule],
  providers: [DatabaseUserRepository, DatabaseTransactionRepository],
  exports: [DatabaseUserRepository, DatabaseTransactionRepository],
})
export class RepositoriesModule {}
