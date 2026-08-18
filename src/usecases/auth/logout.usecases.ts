import { UserRepositoryI } from '@domain/repositories/user-repository.interface';

export class LogoutUseCases {
  constructor(private readonly userRepository: UserRepositoryI) {}

  /**
   * Clears the stored refresh-token hash as well as the cookies. Expiring the
   * cookies alone would leave the refresh token valid server-side, so a copy of
   * it taken before logout would still mint new access tokens.
   */
  async execute(email: string): Promise<string[]> {
    await this.userRepository.clearRefreshToken(email);
    return [
      'Authentication=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      'Refresh=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    ];
  }
}
