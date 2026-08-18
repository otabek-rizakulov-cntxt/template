import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  IException,
  IFormatExceptionMessage,
} from '@domain/exceptions/exceptions.interface';

/**
 * Throws the same real exceptions as the production adapter, so tests assert on
 * observable behaviour rather than on "was this method called".
 */
export class FakeExceptions implements IException {
  BadRequestException(data: IFormatExceptionMessage): never {
    throw new BadRequestException(data);
  }
  InternalServerErrorException(data?: IFormatExceptionMessage): never {
    throw new InternalServerErrorException(data);
  }
  ForbiddenException(data?: IFormatExceptionMessage): never {
    throw new ForbiddenException(data);
  }
  UnauthorizedException(data?: IFormatExceptionMessage): never {
    throw new UnauthorizedException(data);
  }
  NotFoundException(data?: IFormatExceptionMessage): never {
    throw new NotFoundException(data);
  }
  ConflictException(data?: IFormatExceptionMessage): never {
    throw new ConflictException(data);
  }
}
