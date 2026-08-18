import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import type { Server } from 'http';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/config/prisma/prisma.service';

/**
 * Boots the real application graph. Prisma is stubbed so this runs without a
 * database; the point is to prove the module graph resolves and that the routes
 * are mounted where the contract says they are.
 *
 * The previous version of this file was the untouched Nest starter test: it
 * asked for `GET /` and expected the body 'Hello World!', a route this
 * application has never served.
 */
describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: () => Promise.resolve([{ '1': 1 }]),
        users: { findFirst: () => Promise.resolve(null) },
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the liveness probe', async () => {
    const response = await request(app.getHttpServer() as Server).get(
      '/api/health/live',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('reports readiness when the database answers', async () => {
    const response = await request(app.getHttpServer() as Server).get(
      '/api/health/ready',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ database: 'reachable' });
  });

  it('mounts transactions under the versioned prefix', async () => {
    const response = await request(app.getHttpServer() as Server).get(
      '/api/v1/transactions',
    );

    // 401 rather than 404 proves the route exists and is guarded.
    expect(response.status).toBe(401);
  });

  it('requires authentication to read a transaction', async () => {
    const response = await request(app.getHttpServer() as Server).get(
      '/api/v1/transactions/3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    );

    expect(response.status).toBe(401);
  });

  it('rejects an unauthenticated logout', async () => {
    const response = await request(app.getHttpServer() as Server).post(
      '/api/v1/auth/logout',
    );

    expect(response.status).toBe(401);
  });
});
