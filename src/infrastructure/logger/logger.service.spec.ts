import { Logger } from '@nestjs/common';

import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let written: string[];

  beforeEach(() => {
    service = new LoggerService();
    written = [];
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((line: unknown) => written.push(String(line)));
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((line: unknown) => written.push(String(line)));
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((line: unknown) => written.push(String(line)));
  });

  afterEach(() => jest.restoreAllMocks());

  interface LogLine {
    level: string;
    time: string;
    context: string;
    message: string;
    trace?: string;
  }

  const parsed = (): LogLine[] =>
    written.map((line) => JSON.parse(line) as LogLine);

  // Lines used to be plain text, which meant an aggregator could not index them
  // and concurrent requests could not be told apart.
  it('writes a single JSON object per line', () => {
    service.log('SomeContext', 'a message');

    expect(() => parsed()).not.toThrow();
    expect(written).toHaveLength(1);
  });

  it('records level, context and message', () => {
    service.log('SomeContext', 'a message');

    expect(parsed()[0]).toMatchObject({
      level: 'info',
      context: 'SomeContext',
      message: 'a message',
    });
  });

  it('marks warnings with the warn level', () => {
    service.warn('Ctx', 'careful');

    expect(parsed()[0].level).toBe('warn');
  });

  it('includes the trace on an error when one is given', () => {
    service.error('Ctx', 'it broke', 'at somewhere:1:1');

    expect(parsed()[0]).toMatchObject({
      level: 'error',
      trace: 'at somewhere:1:1',
    });
  });

  it('omits the trace field when none is given', () => {
    service.error('Ctx', 'it broke');

    expect(parsed()[0]).not.toHaveProperty('trace');
  });

  it('stamps an ISO timestamp', () => {
    service.log('Ctx', 'msg');

    expect(parsed()[0].time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
