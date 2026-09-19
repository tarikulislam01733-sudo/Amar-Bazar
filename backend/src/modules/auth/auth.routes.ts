import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../shared/middleware/validate';
import { requestOTPSchema, verifyOTPSchema } from './auth.validation';
import { createRateLimiter } from '../../shared/middleware/rateLimiter';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

// Apply OTP rate limiter (3 requests per phone per hour) on the `/register` endpoint.
const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyPrefix: 'route_limit_otp',
  keyGenerator: (req) => req.body.phone || req.ip || 'unknown'
});

router.post('/register', validate(requestOTPSchema), otpRateLimiter, AuthController.requestOTP);
router.post('/verify-otp', validate(verifyOTPSchema), AuthController.verifyOTP);
router.post('/refresh-token', AuthController.refreshAccessToken);
router.post('/logout', authenticate, AuthController.logout);

export default router;
