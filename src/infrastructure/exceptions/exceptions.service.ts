import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  IException,
  IFormatExceptionMessage,
} from '@domain/exceptions/exceptions.interface';

@Injectable()
export class ExceptionsService implements IException {
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
