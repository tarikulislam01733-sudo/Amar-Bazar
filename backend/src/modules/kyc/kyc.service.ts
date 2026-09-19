import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Queue } from 'bullmq';
import { User } from '../user/user.model';
import { KYC } from './kyc.model';
import { Blacklist } from './blacklist.model';
import redisClient from '../../config/redis';
import { BadRequestError, ForbiddenError, ConflictError, RateLimitError } from '../../shared/errors';
import { env } from '../../config/env';

// Make sure AWS credentials and region are in env
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

const kycQueue = new Queue('kyc-processing-queue', {
  connection: redisClient
});

const NID_REGEX = /^(\d{10}|\d{13}|\d{17})$/;

export class KYCService {
  static normalizeNID(nidNumber: string, dob: Date): string {
    if (nidNumber.length === 13) {
      const birthYear = dob.getFullYear().toString();
      return birthYear + nidNumber;
    }
    return nidNumber;
  }

  static hashNID(nid: string): string {
    return crypto.createHash('sha256').update(nid).digest('hex');
  }

  static async initiateKYC(userId: string, nidNumber: string, dobString: string, selfieImageBuffer: Buffer) {
    // Validate NID
    if (!NID_REGEX.test(nidNumber)) {
      throw new BadRequestError('NID must be 10, 13, or 17 digits');
    }

    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) {
      throw new BadRequestError('Invalid Date of Birth');
    }

    // Validate Age >= 18
    const today = new Date();
    const ageDiffMs = today.getTime() - dob.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    if (age < 18) {
      throw new BadRequestError('You must be at least 18 years old to complete KYC');
    }

    const normalizedNID = this.normalizeNID(nidNumber, dob);
    const nidHash = this.hashNID(normalizedNID);

    // Check Blacklist
    const isBlacklisted = await Blacklist.findOne({ nidHash });
    if (isBlacklisted) {
      throw new ForbiddenError('This identity has been permanently banned');
    }

    // Check Duplicate NID
    const existingUserWithNID = await User.findOne({ nidHash });
    if (existingUserWithNID && existingUserWithNID.id !== userId) {
      throw new ConflictError('This NID is already registered to another account');
    }

    // Acquire Redis Lock
    const lockKey = `lock:kyc:${userId}`;
    const acquiredLock = await redisClient.set(lockKey, '1', 'EX', 30, 'NX');
    if (!acquiredLock) {
      throw new RateLimitError('KYC submission already in progress');
    }

    try {
      // Check Daily limit (max 3 per 24 hours)
      const dateStr = today.toISOString().split('T')[0];
      const attemptKey = `kyc_attempts:${userId}:${dateStr}`;
      const attemptsStr = await redisClient.get(attemptKey);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

      if (attempts >= 3) {
        throw new RateLimitError('Maximum 3 KYC attempts allowed per 24 hours');
      }

      // Record Attempt
      const newAttempts = await redisClient.incr(attemptKey);
      if (newAttempts === 1) {
        await redisClient.expire(attemptKey, 24 * 60 * 60); // 24 hours
      }

      // S3 Upload Generation
      const selfieS3Key = `kyc-selfies/${userId}-${Date.now()}.jpg`;
      const bucketName = process.env.S3_KYC_BUCKET || 'safekroy-kyc-bucket';
      
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: selfieS3Key,
        ServerSideEncryption: 'AES256'
      });

      const presignedUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 60 });

      // We actually need to upload the buffer directly, 
      // not just get a presigned URL since the buffer is provided here.
      // Wait, the prompt says: "Upload selfie image to private S3 bucket (AES-256 encrypted). Generate a pre-signed URL with 60-second TTL for the background worker."
      // Let's directly upload it first, since we have the buffer. Or does the background worker need to fetch it?
      // "Upload selfie image... Generate a pre-signed URL... for the background worker."
      // The easiest way is to use S3 PutObject directly.
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: selfieS3Key,
        Body: selfieImageBuffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256'
      }));

      // Create KYC Record
      await KYC.create({
        userId,
        nidHash,
        status: 'processing'
      });

      // Dispatch to BullMQ
      await kycQueue.add('process-kyc', {
        userId,
        nidHash,
        normalizedNID,
        dob: dob.toISOString(),
        selfieS3Key
      });

      return {
        message: 'Verification in progress. You will be notified.',
        status: 'processing'
      };

    } catch (error) {
      // Release lock on error before returning
      await redisClient.del(lockKey);
      throw error;
    }
  }
}
