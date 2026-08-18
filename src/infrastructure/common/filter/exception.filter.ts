import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

import { ILogger } from '@domain/logger/logger.interface';

interface ErrorBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  code_error?: number | string;
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: ILogger,
    private readonly isProduction: boolean = false,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...this.describe(exception, isHttp, status),
    };

    this.log(request, body, status, exception);
    response.status(status).json(body);
  }

  /**
   * Only HttpExceptions carry a message meant for a client. Anything else is an
   * internal failure, and its message — a Prisma error, a driver stack, a
   * connection string — must not be echoed back in production.
   */
  private describe(
    exception: unknown,
    isHttp: boolean,
    status: number,
  ): Pick<ErrorBody, 'message' | 'code_error'> {
    if (isHttp) {
      const payload = (exception as HttpException).getResponse();
      if (typeof payload === 'string') {
        return { message: payload };
      }
      const shaped = payload as {
        message?: string | string[];
        code_error?: number;
      };
      return {
        message: shaped.message ?? (exception as HttpException).message,
        code_error: shaped.code_error ?? status,
      };
    }

    return {
      message: this.isProduction
        ? 'Internal server error'
        : ((exception as Error)?.message ?? 'Internal server error'),
      code_error: status,
    };
  }

  private log(
    request: Request,
    body: ErrorBody,
    status: number,
    exception: unknown,
  ) {
    const summary = `method=${request.method} status=${status} code_error=${
      body.code_error ?? 'null'
    } message=${JSON.stringify(body.message)}`;

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      // The full detail still goes to the log, where operators can see it.
      this.logger.error(
        `End Request for ${request.path}`,
        summary,
        exception instanceof Error ? (exception.stack ?? '') : '',
      );
    } else {
      this.logger.warn(`End Request for ${request.path}`, summary);
    }
  }
}
