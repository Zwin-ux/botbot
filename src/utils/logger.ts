// Simple structured logger wrapper (pino-like) with console fallback and secret scrubbing.
// Env vars used: LOG_LEVEL (optional, defaults to info).

import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  redact: {
    paths: ['*.apiKey', '*.password', '*.token', '*.secret'],
    censor: '[REDACTED]',
  },
});

export default logger;
