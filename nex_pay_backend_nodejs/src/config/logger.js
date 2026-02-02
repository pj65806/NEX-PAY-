import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let logger;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

export const setupLogger = () => {
  if (logger) return logger;

  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: logFormat,
    defaultMeta: { service: 'nex-pay-backend' },
    transports: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        maxsize: 10485760,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        maxsize: 10485760,
        maxFiles: 10,
      }),
    ],
  });

  return logger;
};

export const getLogger = () => {
  if (!logger) {
    return setupLogger();
  }
  return logger;
};
