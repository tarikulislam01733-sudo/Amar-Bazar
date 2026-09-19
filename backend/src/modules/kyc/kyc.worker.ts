import { Worker } from 'bullmq';
import { Emitter } from '@socket.io/redis-emitter';
import redisClient from '../../config/redis';
import { KYC } from './kyc.model';
import { User } from '../user/user.model';
import { logger } from '../../config/logger';

// Setup Socket.IO redis emitter
const ioEmitter = new Emitter(redisClient);

// Mock Porichoy API Call
async function callPorichoyAPI(normalizedNID: string, dob: string) {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 2000));
  
  // Random failure (1 in 10 chance) to simulate 5xx
  if (Math.random() < 0.1) {
    throw new Error('Porichoy Service Unavailable');
  }

  // Simulate returning some data
  return {
    success: true,
    data: {
      nidPhoto: 'mock_base64_photo_data',
      legalNameBangla: 'নমুনা নাম',
    }
  };
}

// Mock Face Match Engine
async function callFaceMatch(nidPhoto: string, selfieS3Key: string): Promise<number> {
  // Simulate processing time
  await new Promise(res => setTimeout(res, 1500));
  
  // Return random confidence between 50 and 99
  return Math.floor(Math.random() * (99 - 50 + 1) + 50);
}

export const kycWorker = new Worker('kyc-processing-queue', async job => {
  const { userId, nidHash, normalizedNID, dob, selfieS3Key } = job.data;
  const lockKey = `lock:kyc:${userId}`;

  try {
    const porichoyResponse = await callPorichoyAPI(normalizedNID, dob);
    const confidence = await callFaceMatch(porichoyResponse.data.nidPhoto, selfieS3Key);

    const kycRecord = await KYC.findOne({ userId, status: 'processing' });
    if (!kycRecord) return; // Maybe already processed or deleted

    const userRoom = `user:${userId}`;

    if (confidence >= 85) {
      // Pass
      await User.findByIdAndUpdate(userId, {
        nidHash,
        legalNameBangla: porichoyResponse.data.legalNameBangla,
        role: 'verified'
      });

      kycRecord.status = 'verified';
      kycRecord.livenessConfidence = confidence;
      await kycRecord.save();

      ioEmitter.to(userRoom).emit('KYC_VERIFIED', {
        message: 'Your identity has been verified successfully.'
      });
    } else {
      // Fail
      kycRecord.status = 'rejected';
      kycRecord.rejectionReason = 'Face match confidence too low';
      kycRecord.livenessConfidence = confidence;
      await kycRecord.save();

      ioEmitter.to(userRoom).emit('KYC_REJECTED', {
        reason: 'Face match confidence too low. Please ensure good lighting and try again.'
      });
    }
  } catch (error: any) {
    logger.error(`KYC Job Failed for User ${userId}:`, error.message);
    throw error; // Will be retried by BullMQ
  } finally {
    // Only release lock if it's not going to be retried right away
    // To prevent immediate retries by the user if it failed, 
    // we just release it. The rate limiter prevents abuse.
    await redisClient.del(lockKey);
  }
}, {
  connection: redisClient,
  settings: {
    backoffStrategy: (attemptsMade: number, type?: string, err?: Error, job?: any) => {
      // 2m, 5m, 15m
      const backoffs = [120000, 300000, 900000];
      return backoffs[attemptsMade - 1] || 900000;
    }
  },
  limiter: {
    max: 10,
    duration: 1000,
  }
});

kycWorker.on('failed', (job, err) => {
  logger.error(`BullMQ: Job ${job?.id} failed with error ${err.message}`);
});
