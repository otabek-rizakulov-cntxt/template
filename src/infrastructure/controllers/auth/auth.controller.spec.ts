import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule as NestJwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import type { Server } from 'http';

import { Symbols } from '@domain/symbols';
import { JWTConfig } from '@domain/config/jwt.interface';

import { ValidatorConfig } from '@infrastructure/config';
import { AuthController } from '@infrastructure/controllers/auth/auth.controller';
import { BcryptService } from '@infrastructure/services/bcrypt/bcrypt.service';
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service';
import { JwtTokenService } from '@infrastructure/services/jwt/jwt.service';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { LocalStrategy } from '@infrastructure/common/strategies/local.strategy';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';

import { LoginUseCases } from '@usecases/auth/login.usecases';
import { LogoutUseCases } from '@usecases/auth/logout.usecases';
import { RegisterUseCases } from '@usecases/auth/register.usecases';
import { IsAuthenticatedUseCases } from '@usecases/auth/is-authenticated.usecases';
import { FakeLogger } from '@usecases/testing/fake-logger';
import { InMemoryUserRepository } from '@usecases/testing/in-memory-user-repository';

const testJwtConfig: JWTConfig = {
  getJwtSecret: () => 'access-secret',
  getJwtExpirationTime: () => '3600',
  getJwtRefreshSecret: () => 'refresh-secret',
  getJwtRefreshExpirationTime: () => '86400',
};

const PASSWORD = 'Correct-horse1!';
const EMAIL = 'user@example.com';

describe('AuthController (login)', () => {
  let app: INestApplication;
  let users: InMemoryUserRepository;

  const login = (password: string, email: string = EMAIL) =>
    request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({ email, password });

  beforeEach(async () => {
    const bcrypt = new BcryptService();
    users = new InMemoryUserRepository();
    users.seedUser({ email: EMAIL, password: await bcrypt.hash(PASSWORD) });

    const exceptions = new ExceptionsService();
    const loginUseCases = new LoginUseCases(
      new FakeLogger(),
      new JwtTokenService(new JwtService({ secret: 'access-secret' })),
      testJwtConfig,
      users,
      bcrypt,
    );

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        NestJwtModule.register({ secret: 'access-secret' }),
      ],
      controllers: [AuthController],
      providers: [
        LocalStrategy,
        { provide: LoggerService, useValue: new FakeLogger() },
        { provide: ExceptionsService, useValue: exceptions },
        {
          provide: Symbols.LOGIN_USECASES_PROXY,
          useValue: new UseCaseProxy(loginUseCases),
        },
        {
          provide: Symbols.LOGOUT_USECASES_PROXY,
          useValue: new UseCaseProxy(new LogoutUseCases(users)),
        },
        {
          provide: Symbols.REGISTER_USECASES_PROXY,
          useValue: new UseCaseProxy(
            new RegisterUseCases(users, exceptions, bcrypt),
          ),
        },
        {
          provide: Symbols.IS_AUTHENTICATED_USECASES_PROXY,
          useValue: new UseCaseProxy(new IsAuthenticatedUseCases(users)),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(ValidatorConfig));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a login with the wrong password', async () => {
    const response = await login('wrong-password');

    expect(response.status).toBe(401);
  });

  it('sets no session cookie when the password is wrong', async () => {
    const response = await login('wrong-password');

    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a login for an unknown email', async () => {
    const response = await login(PASSWORD, 'nobody@example.com');

    expect(response.status).toBe(401);
  });

  it('issues access and refresh cookies for correct credentials', async () => {
    const response = await login(PASSWORD);

    expect(response.status).toBe(201);
    const cookies = [response.headers['set-cookie']].flat().join(';');
    expect(cookies).toContain('Authentication=');
    expect(cookies).toContain('Refresh=');
  });

  it('records the login time on success', async () => {
    await login(PASSWORD);

    const user = await users.getUserByEmail(EMAIL);
    expect(user?.lastLogin).toBeInstanceOf(Date);
  });
});
