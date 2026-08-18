export interface IFormatExceptionMessage {
  message: string;
  code_error?: number;
}

/**
 * Every method throws, so each is typed `never`. That lets TypeScript narrow
 * control flow at the call site — `if (!user) this.exceptions.NotFound(...)`
 * is enough to prove `user` is non-null afterwards, with no cast.
 */
export interface IException {
  BadRequestException(data: IFormatExceptionMessage): never;
  InternalServerErrorException(data?: IFormatExceptionMessage): never;
  ForbiddenException(data?: IFormatExceptionMessage): never;
  UnauthorizedException(data?: IFormatExceptionMessage): never;
  NotFoundException(data?: IFormatExceptionMessage): never;
  ConflictException(data?: IFormatExceptionMessage): never;
}
