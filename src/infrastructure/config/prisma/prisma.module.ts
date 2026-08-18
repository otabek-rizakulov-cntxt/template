import { Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';
import { EnvironmentConfigModule } from '@config/environment-config/environment-config.module';

/**
 * Deliberately not @Global(): a module that needs database access imports this
 * one explicitly. Making it global put the Prisma client in reach of every
 * layer, which quietly undercut the boundary the rest of the design maintains.
 */
@Module({
  imports: [EnvironmentConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
