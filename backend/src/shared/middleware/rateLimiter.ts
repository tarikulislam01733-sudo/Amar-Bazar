import { Request, Response, NextFunction } from 'express';
import redisClient from '../../config/redis';
import { RateLimitError } from '../errors/RateLimitError';
import { logger } from '../../config/logger';

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = ({ windowMs, maxRequests, keyPrefix, keyGenerator }: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use custom key generator if provided, else default to userId or IP
      const identifier = keyGenerator ? keyGenerator(req) : (req.user?.userId || req.ip || 'unknown');
      const key = `${keyPrefix}:${identifier}`;
      
      const current = await redisClient.incr(key);
      
      if (current === 1) {
        // Set expiry for the first request in the window
        await redisClient.pexpire(key, windowMs);
      } else {
        // Check TTL to ensure key expires correctly (in case pexpire failed previously)
        const ttl = await redisClient.pttl(key);
        if (ttl === -1) {
           await redisClient.pexpire(key, windowMs);
        }
      }

      if (current > maxRequests) {
        const ttl = await redisClient.pttl(key);
        // Retry-After expects seconds
        res.setHeader('Retry-After', Math.ceil(ttl / 1000));
        return next(new RateLimitError('Too many requests, please try again later.'));
      }
      
      next();
    } catch (error) {
      logger.error('Redis Rate Limiter Error:', error);
      // Fail open if Redis is down
      next();
    }
  };
};
