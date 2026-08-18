import { Request } from 'express';
import {
  ExtractJwt,
  Strategy,
  StrategyOptionsWithRequest,
  JwtFromRequestFunction,
} from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';

import { LoggerService } from '@infrastructure/logger/logger.service';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service';
import { EnvironmentConfigService } from '@config/environment-config/environment-config.service';

import { LoginUseCases } from '@usecases/auth/login.usecases';

import { Symbols } from '@domain/symbols';
import { TokenPayload } from '@domain/model/auth';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    // Plain parameter, not a property: it is only needed to build the strategy
    // options below, so keeping it as a field would be dead state.
    configService: EnvironmentConfigService,
    @Inject(Symbols.LOGIN_USECASES_PROXY)
    private readonly loginUseCaseProxy: UseCaseProxy<LoginUseCases>,
    private readonly logger: LoggerService,
    private readonly exceptionService: ExceptionsService,
  ) {
    const extractJwtFromCookie: JwtFromRequestFunction = (
      request: Request,
    ): string | null => {
      return request?.cookies?.Refresh as string | null;
    };

    const jwtExtractor = ExtractJwt.fromExtractors([extractJwtFromCookie]);

    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: jwtExtractor,
      secretOrKey: configService.getJwtRefreshSecret(),
      passReqToCallback: true,
    };

    super(options);
  }

  async validate(request: Request, payload: TokenPayload) {
    const refreshToken = request.cookies?.Refresh as string;
    const user = await this.loginUseCaseProxy
      .getInstance()
      .getUserIfRefreshTokenMatches(refreshToken, payload.email);
    if (!user) {
      this.logger.warn('JwtStrategy', `User not found or hash not correct`);
      this.exceptionService.UnauthorizedException({
        message: 'User not found or hash not correct',
      });
    }
    return user;
  }
}
