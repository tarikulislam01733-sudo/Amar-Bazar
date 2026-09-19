import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

// Create singleton Redis client
const redisClient = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Ensure we don't block if Redis is down
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

// For Socket.io adapter or Pub/Sub
export const createRedisSubscriber = (): Redis => {
  const subscriber = new Redis(env.REDIS_URL);
  
  subscriber.on('connect', () => {
    logger.info('Redis subscriber connected');
  });
  
  subscriber.on('error', (err) => {
    logger.error('Redis subscriber error:', err);
  });
  
  return subscriber;
};

export default redisClient;
