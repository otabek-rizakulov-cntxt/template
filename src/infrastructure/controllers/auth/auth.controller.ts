import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest, Response } from 'express';

import { IsAuthPresenter } from './auth.presenter';
import { AuthLoginDto } from './validators/auth-dto.class';
import { RegisterDto } from './validators/register-dto.class';

import { Symbols } from '@domain/symbols';

import { LoginGuard } from '@infrastructure/common/guards/login.guard';
import { JwtAuthGuard } from '@infrastructure/common/guards/jwtAuth.guard';
import JwtRefreshGuard from '@infrastructure/common/guards/jwtRefresh.guard';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';
import { ApiResponseType } from '@infrastructure/common/swagger/response.decorator';

import { LoginUseCases } from '@usecases/auth/login.usecases';
import { LogoutUseCases } from '@usecases/auth/logout.usecases';
import { RegisterUseCases } from '@usecases/auth/register.usecases';
import { IsAuthenticatedUseCases } from '@usecases/auth/is-authenticated.usecases';

/**
 * Shape of the request on a guarded route. `user` is populated by the Passport
 * strategy behind the guard, so it is non-optional here — every handler that
 * reads it is protected by LoginGuard, JwtAuthGuard or JwtRefreshGuard.
 */
interface RequestWithUser extends ExpressRequest {
  user: { email: string };
  res: Response;
}

@Controller({
  version: '1',
  path: 'auth',
})
@ApiTags('auth')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiExtraModels(IsAuthPresenter)
export class AuthController {
  constructor(
    @Inject(Symbols.LOGIN_USECASES_PROXY)
    private readonly loginUseCaseProxy: UseCaseProxy<LoginUseCases>,
    @Inject(Symbols.LOGOUT_USECASES_PROXY)
    private readonly logoutUseCaseProxy: UseCaseProxy<LogoutUseCases>,
    @Inject(Symbols.IS_AUTHENTICATED_USECASES_PROXY)
    private readonly isAuthUseCaseProxy: UseCaseProxy<IsAuthenticatedUseCases>,
    @Inject(Symbols.REGISTER_USECASES_PROXY)
    private readonly registerUseCaseProxy: UseCaseProxy<RegisterUseCases>,
  ) {}

  @Post('login')
  @UseGuards(LoginGuard)
  @ApiBody({ type: AuthLoginDto })
  @ApiOperation({ description: 'login' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Request() request: RequestWithUser) {
    // LoginGuard runs LocalStrategy, which verifies the password and populates
    // request.user. Never trust the request body for identity here.
    const email = request.user.email;

    const accessTokenCookie = this.loginUseCaseProxy
      .getInstance()
      .getCookieWithJwtToken(email);
    const refreshTokenCookie = await this.loginUseCaseProxy
      .getInstance()
      .getCookieWithJwtRefreshToken(email);
    request.res.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);
    return 'Login successful';
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'logout' })
  async logout(@Request() request: RequestWithUser) {
    const cookie = await this.logoutUseCaseProxy
      .getInstance()
      .execute(request.user?.email ?? '');
    request.res.setHeader('Set-Cookie', cookie);
    return 'Logout successful';
  }

  @Get('is_authenticated')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'is_authenticated' })
  @ApiResponseType(IsAuthPresenter, false)
  async isAuthenticated(@Req() request: RequestWithUser) {
    const user = await this.isAuthUseCaseProxy
      .getInstance()
      .execute(request.user?.email ?? '');
    const response = new IsAuthPresenter();
    response.email = user?.email || '';
    return response;
  }

  @Get('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  refresh(@Req() request: RequestWithUser) {
    const accessTokenCookie = this.loginUseCaseProxy
      .getInstance()
      .getCookieWithJwtToken(request.user?.email ?? '');
    request.res.setHeader('Set-Cookie', accessTokenCookie);
    return 'Refresh successful';
  }

  @Post('register')
  @ApiBearerAuth()
  @ApiBody({ type: AuthLoginDto })
  @ApiOperation({ description: 'register' })
  async register(@Body() user: RegisterDto, @Req() request: RequestWithUser) {
    const auth = await this.registerUseCaseProxy.getInstance().execute(user);
    const accessTokenCookie = this.loginUseCaseProxy
      .getInstance()
      .getCookieWithJwtToken(auth.email);
    const refreshTokenCookie = await this.loginUseCaseProxy
      .getInstance()
      .getCookieWithJwtRefreshToken(auth.email);
    request.res.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);
    return 'Successfully registered';
  }
}
