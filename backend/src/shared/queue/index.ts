import { Queue } from 'bullmq';
import { env } from '../../config/env';
import Redis from 'ioredis';

// Reuse connection for BullMQ
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const smsQueue = new Queue('sms-queue', { connection });
