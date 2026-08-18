import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '@config/prisma/prisma.service';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness: the process is up and serving. Deliberately does not touch the
   * database — a failing dependency should not cause the orchestrator to kill an
   * otherwise healthy process.
   */
  @Get('live')
  @ApiOperation({ description: 'Liveness probe' })
  live() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }

  /**
   * Readiness: the process can actually serve traffic, which means the database
   * is reachable. The previous implementation returned a fixed string and so
   * reported healthy while the database was down.
   */
  @Get('ready')
  @ApiOperation({ description: 'Readiness probe — verifies database access' })
  @ApiResponse({ status: 503, description: 'A dependency is unavailable' })
  async ready() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'unreachable',
      });
    }
    return {
      status: 'ok',
      database: 'reachable',
      latencyMs: Date.now() - startedAt,
    };
  }
}
