import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  IJwtService,
  IJwtServicePayload,
} from '@domain/adapters/jwt.interface';

@Injectable()
export class JwtTokenService implements IJwtService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * `verifyAsync` is generic, so naming the expected payload here removes the
   * `any` that previously had to be suppressed at both the assignment and the
   * return.
   */
  checkToken(token: string): Promise<IJwtServicePayload> {
    return this.jwtService.verifyAsync<IJwtServicePayload>(token);
  }

  createToken(
    payload: IJwtServicePayload,
    secret: string,
    expiresIn: string,
  ): string {
    return this.jwtService.sign(payload, { secret, expiresIn });
  }
}
