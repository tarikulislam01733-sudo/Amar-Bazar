import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, json } = winston.format;

const myFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    env.NODE_ENV === 'production' ? json() : combine(colorize(), myFormat)
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
