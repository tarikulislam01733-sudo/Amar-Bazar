import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import app from './app';
import { logger } from './config/logger';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import redisClient, { createRedisSubscriber } from './config/redis';

const server = http.createServer(app);

// Initialize Socket.io server with Redis adapter
const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// Configure Redis adapter for multi-node scaling
const pubClient = redisClient;
const subClient = createRedisSubscriber();
io.adapter(createAdapter(pubClient, subClient));

// Socket connection handling
io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    // Call connectDatabase and wait for MongoDB connection
    await connectDatabase();

    // Start listening on the configured PORT
    server.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  gracefulShutdown();
});

const gracefulShutdown = () => {
  logger.info('Attempting graceful shutdown...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(1);
  });

  // Force shutdown if it takes too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};
