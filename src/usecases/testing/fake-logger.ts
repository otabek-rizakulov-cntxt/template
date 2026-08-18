import { ILogger } from '@domain/logger/logger.interface';

/** Collects log lines instead of writing them, so tests stay quiet. */
export class FakeLogger implements ILogger {
  readonly lines: string[] = [];

  debug(context: string, message: string): void {
    this.lines.push(`debug ${context} ${message}`);
  }
  log(context: string, message: string): void {
    this.lines.push(`log ${context} ${message}`);
  }
  error(context: string, message: string): void {
    this.lines.push(`error ${context} ${message}`);
  }
  warn(context: string, message: string): void {
    this.lines.push(`warn ${context} ${message}`);
  }
  verbose(context: string, message: string): void {
    this.lines.push(`verbose ${context} ${message}`);
  }
}
