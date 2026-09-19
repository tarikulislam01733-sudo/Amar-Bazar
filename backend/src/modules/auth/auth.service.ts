import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../user/user.model';
import redisClient from '../../config/redis';
import { env } from '../../config/env';
import { smsQueue } from '../../shared/queue';
import { UnauthorizedError } from '../../shared/errors/UnauthorizedError';
import { RateLimitError } from '../../shared/errors/RateLimitError';
import { AppError } from '../../shared/errors/AppError';

const hashData = (data: string) => crypto.createHash('sha256').update(data).digest('hex');

export class AuthService {
  static async requestOTP(phone: string) {
    const rateLimitKey = `otp_limit:${phone}`;
    const currentRequests = await redisClient.incr(rateLimitKey);
    
    if (currentRequests === 1) {
      await redisClient.expire(rateLimitKey, 3600);
    }

    if (currentRequests > 3) {
      throw new RateLimitError('Max 3 OTP requests per phone per hour.');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOTP = hashData(otp);

    const otpKey = `otp:${phone}`;
    await redisClient.setex(otpKey, 300, hashedOTP);

    await smsQueue.add('send-otp', {
      phone,
      message: `Your SafeKroy OTP is ${otp}. Valid for 5 minutes.`,
    });

    return { message: 'OTP sent', expiresIn: 300 };
  }

  static async verifyOTP(phone: string, otp: string) {
    const otpKey = `otp:${phone}`;
    const storedHashedOTP = await redisClient.get(otpKey);

    if (!storedHashedOTP || storedHashedOTP !== hashData(otp)) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    await redisClient.del(otpKey);

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone, role: 'registered', status: 'active' });
    }

    const payload = {
      userId: user.id,
      role: user.role,
      isNidVerified: !!user.nidHash,
      deviceId: 'web',
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY as any });

    const tokenId = crypto.randomBytes(16).toString('hex');
    const tokenValue = crypto.randomBytes(64).toString('hex');
    const hashedTokenValue = hashData(tokenValue);

    const refreshKey = `refresh:${user.id}:${tokenId}`;
    const refreshTTL = 30 * 24 * 60 * 60; // 30 days
    await redisClient.setex(refreshKey, refreshTTL, hashedTokenValue);

    // Format: base64(userId:tokenId:tokenValue)
    const refreshToken = Buffer.from(`${user.id}:${tokenId}:${tokenValue}`).toString('base64');

    return { accessToken, refreshToken, user };
  }

  static async refreshAccessToken(encodedToken: string) {
    try {
      const decoded = Buffer.from(encodedToken, 'base64').toString('ascii');
      const [userId, tokenId, tokenValue] = decoded.split(':');

      if (!userId || !tokenId || !tokenValue) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const refreshKey = `refresh:${userId}:${tokenId}`;
      const storedHashedToken = await redisClient.get(refreshKey);

      if (!storedHashedToken) {
        // Breached detected: purge all
        const keys = await redisClient.keys(`refresh:${userId}:*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        throw new UnauthorizedError('Refresh token reused or invalid, logging out of all devices');
      }

      if (storedHashedToken !== hashData(tokenValue)) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Valid: Rotate it
      await redisClient.del(refreshKey);

      const user = await User.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      const payload = {
        userId: user.id,
        role: user.role,
        isNidVerified: !!user.nidHash,
        deviceId: 'web',
      };

      const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY as any });

      const newTokenId = crypto.randomBytes(16).toString('hex');
      const newTokenValue = crypto.randomBytes(64).toString('hex');
      
      const newRefreshKey = `refresh:${user.id}:${newTokenId}`;
      await redisClient.setex(newRefreshKey, 30 * 24 * 60 * 60, hashData(newTokenValue));

      const newRefreshToken = Buffer.from(`${user.id}:${newTokenId}:${newTokenValue}`).toString('base64');

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  static async logout(userId: string, encodedToken: string) {
    try {
      const decoded = Buffer.from(encodedToken, 'base64').toString('ascii');
      const [tokenUserId, tokenId] = decoded.split(':');

      if (tokenUserId === userId) {
        await redisClient.del(`refresh:${userId}:${tokenId}`);
      }
    } catch (e) {
      // Ignore parse errors on logout
    }
  }
}
