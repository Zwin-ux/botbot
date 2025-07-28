import pino from "pino";
import pinoPretty from "pino-pretty";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import config from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create logs directory if it doesn't exist
const logDir = path.join(config.ROOT_DIR, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure log streams
const streams = [
  // Console output in development, pretty-printed
  {
    level: config.LOG_LEVEL,
    stream: pinoPretty({
      colorize: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
      messageFormat: (log, messageKey) => {
        if (log.req)
          return `${log.req.method} ${log.req.url} - ${log.res.statusCode} in ${log.responseTime}ms`;
        if (log.msg) return log.msg;
        return "";
      },
    }),
  },
  // File output in production
  ...(config.isProduction
    ? [
        {
          level: "info",
          stream: pino.destination({
            dest: path.join(logDir, config.LOG_FILE),
            mkdir: true,
            sync: false,
          }),
        },
      ]
    : []),
  // Error log file for all environments
  {
    level: "error",
    stream: pino.destination({
      dest: path.join(logDir, "error.log"),
      mkdir: true,
      sync: false,
    }),
  },
];

// Create logger instance
const logger = pino(
  {
    level: config.LOG_LEVEL,
    base: {
      env: config.NODE_ENV,
      pid: process.pid,
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
      }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
      }),
    },
  },
  pino.multistream(streams),
);

/**
 * Middleware for Express/Connect style request logging
 * @returns {Function} Middleware function
 */
logger.expressMiddleware = () => {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const responseTime = Date.now() - start;
      const { method, originalUrl, headers } = req;
      const { statusCode } = res;

      const logLevel =
        statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

      logger[logLevel]({
        req: { method, url: originalUrl, headers },
        res: { statusCode },
        responseTime: `${responseTime}ms`,
        message: `${method} ${originalUrl} - ${statusCode} in ${responseTime}ms`,
      });
    });

    next();
  };
};

/**
 * Logs an error with additional context
 * @param {Error} error - The error to log
 * @param {Object} context - Additional context to include in the log
 * @param {string} [message] - Optional custom error message
 */
logger.logError = (error, context = {}, message) => {
  const logContext = {
    ...context,
    stack: error.stack,
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      ...(error.response?.data && { response: error.response.data }),
    },
  };

  logger.error(logContext, message || context.message || "Error occurred");
};

/**
 * Logs a warning with context
 * @param {string} message - Warning message
 * @param {Object} [context] - Additional context
 */
logger.logWarning = (message, context = {}) => {
  logger.warn({ ...context }, message);
};

/**
 * Logs an info message with context
 * @param {string} message - Info message
 * @param {Object} [context] - Additional context
 */
logger.logInfo = (message, context = {}) => {
  logger.info({ ...context }, message);
};

/**
 * Logs a debug message with context
 * @param {string} message - Debug message
 * @param {Object} [context] - Additional context
 */
logger.logDebug = (message, context = {}) => {
  logger.debug({ ...context }, message);
};

/**
 * Logs an API response
 * @param {Object} response - Axios response object
 * @param {Object} context - Additional context
 */
logger.logApiResponse = (response, context = {}) => {
  const { status, statusText, config } = response;
  const { method, url, baseURL } = config;

  logger.info(
    {
      ...context,
      response: {
        status,
        statusText,
        url: baseURL ? new URL(url, baseURL).toString() : url,
        method: method.toUpperCase(),
        duration: response.duration,
        data: response.data,
      },
    },
    `API Response: ${status} ${statusText}`,
  );
};

/**
 * Creates a child logger with bound context
 * @param {Object} context - Context to bind to all logs
 * @returns {Object} Child logger instance
 */
logger.child = (context) => {
  return logger.child(context);
};

// Export the logger
export { logger };
export default logger;
