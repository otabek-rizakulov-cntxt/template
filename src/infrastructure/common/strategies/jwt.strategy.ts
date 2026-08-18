import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';

import { Symbols } from '@domain/symbols';

import { LoginUseCases } from '@usecases/auth/login.usecases';

import { LoggerService } from '@infrastructure/logger/logger.service';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service';
import { EnvironmentConfigService } from '@config/environment-config/environment-config.service';

interface JwtPayload {
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: EnvironmentConfigService,
    @Inject(Symbols.LOGIN_USECASES_PROXY)
    private readonly loginUseCaseProxy: UseCaseProxy<LoginUseCases>,
    private readonly logger: LoggerService,
    private readonly exceptionService: ExceptionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          (request?.cookies?.Authentication as string | null) ?? null,
      ]),
      // Read through the validated config adapter rather than process.env, so
      // there is one place where a missing secret is caught: application boot.
      secretOrKey: configService.getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.loginUseCaseProxy
      .getInstance()
      .validateUserForJWTStrategy(payload.email);
    if (!user) {
      this.logger.warn('JwtStrategy', `User not found`);
      this.exceptionService.UnauthorizedException({
        message: 'User not found',
      });
    }
    return user;
  }
}
