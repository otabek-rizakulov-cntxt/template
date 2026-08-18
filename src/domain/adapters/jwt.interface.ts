export interface IJwtServicePayload {
  email: string;
}

export interface IJwtService {
  checkToken(token: string): Promise<IJwtServicePayload>;
  createToken(
    payload: IJwtServicePayload,
    secret: string,
    expiresIn: string,
  ): string;
}
