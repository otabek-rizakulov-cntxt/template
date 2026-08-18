import { Injectable, Logger } from '@nestjs/common';
import { ILogger } from '@domain/logger/logger.interface';

/**
 * Emits one JSON object per line so log aggregators can index the fields
 * instead of parsing prose. Plain-text lines could not be correlated once more
 * than one request was in flight.
 */
@Injectable()
export class LoggerService extends Logger implements ILogger {
  private emit(
    level: 'debug' | 'info' | 'error' | 'warn' | 'verbose',
    context: string,
    message: string,
    trace?: string,
  ): void {
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      context,
      message,
      ...(trace ? { trace } : {}),
    });

    if (level === 'error') {
      super.error(line);
      return;
    }
    if (level === 'warn') {
      super.warn(line);
      return;
    }
    super.log(line);
  }

  override debug(context: string, message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.emit('debug', context, message);
    }
  }

  override log(context: string, message: string): void {
    this.emit('info', context, message);
  }

  override error(context: string, message: string, trace?: string): void {
    this.emit('error', context, message, trace);
  }

  override warn(context: string, message: string): void {
    this.emit('warn', context, message);
  }

  override verbose(context: string, message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.emit('verbose', context, message);
    }
  }
}
