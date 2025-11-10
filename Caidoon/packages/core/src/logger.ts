import pino from 'pino';

export interface LoggerOptions {
  serviceName: string;
  level?: string;
  pretty?: boolean;
}

export const createLogger = (options: LoggerOptions) => {
  const { serviceName, level, pretty = process.env.NODE_ENV !== 'production' } = options;

  const logLevel = level || process.env.LOG_LEVEL || 'info';

  const pinoOptions: pino.LoggerOptions = {
    name: serviceName,
    level: logLevel,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // Use pretty printing in development
  if (pretty) {
    return pino(pinoOptions, pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    }));
  }

  return pino(pinoOptions);
};

export type Logger = ReturnType<typeof createLogger>;
