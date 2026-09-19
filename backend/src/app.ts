import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import apiRouter from './routes/index';

const app: Application = express();

// HTTP logging via Winston stream
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

// Apply global middlewares in order
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream }));

// Mount the API router
app.use('/api/v1', apiRouter);

// Global error handling middleware
app.use(errorHandler);

export default app;
