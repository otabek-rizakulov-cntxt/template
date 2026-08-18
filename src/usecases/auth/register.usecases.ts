import { Users } from '@prisma/client';

import { IBcryptService } from '@domain/adapters/bcrypt.interface';
import { IException } from '@domain/exceptions/exceptions.interface';
import {
  RegisterUserI,
  UserRepositoryI,
} from '@domain/repositories/user-repository.interface';

export class RegisterUseCases {
  constructor(
    private readonly userRepository: UserRepositoryI,
    private readonly exceptionService: IException,
    private readonly bcryptService: IBcryptService,
  ) {}

  async execute(user: RegisterUserI): Promise<Users> {
    const existing = await this.userRepository.getUserByEmail(user.email);

    if (existing) {
      this.exceptionService.ConflictException({
        message: 'A user with this email already exists',
        code_error: 409,
      });
    }

    // Hashing is a rule about how credentials are stored, so it belongs here
    // rather than inside the persistence adapter.
    return this.userRepository.register({
      ...user,
      password: await this.bcryptService.hash(user.password),
    });
  }
}
