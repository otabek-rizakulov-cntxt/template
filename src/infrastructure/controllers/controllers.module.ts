import { Module } from '@nestjs/common';

import { PrismaModule } from '@config/prisma/prisma.module';

import { AuthController } from './auth/auth.controller';
import { HealthController } from './health/health.controller';
import { TransactionsController } from './transactions/transactions.controller';

import { AuthUseCasesProxyModule } from '@usecases/auth/auth-usecases-proxy.module';
import { TransactionsUseCasesProxyModule } from '@usecases/transactions/transactions-usecases-proxy.module';

@Module({
  imports: [
    PrismaModule,
    AuthUseCasesProxyModule.register(),
    TransactionsUseCasesProxyModule.register(),
  ],
  controllers: [AuthController, HealthController, TransactionsController],
})
export class ControllersModule {}
