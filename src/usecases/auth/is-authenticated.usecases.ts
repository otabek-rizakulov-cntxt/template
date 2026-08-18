import { PublicUser, toPublicUser } from '@domain/model/user';
import { UserRepositoryI } from '@domain/repositories/user-repository.interface';

export class IsAuthenticatedUseCases {
  constructor(private readonly userRepository: UserRepositoryI) {}

  async execute(email: string): Promise<PublicUser | null> {
    const user = await this.userRepository.getUserByEmail(email);
    return user ? toPublicUser(user) : null;
  }
}
